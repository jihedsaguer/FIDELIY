import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { TenantContextService } from '../../shared/database/tenant-context.service';
import {
  deriveCustomerQrCodes,
  verifyCustomerQrCredential,
} from '../../shared/security/customer-qr';
import {
  listRewards,
  type ProgrammeConfiguration,
} from '../loyalty/earning-calculator';
import { LoyaltyLedgerService } from '../loyalty/loyalty-ledger.service';
import { JoinBusinessDto } from './dto/customer-membership.dto';

type MembershipStatus = 'active' | 'inactive';
type ProgramType = 'stamps' | 'points' | 'both';

interface CustomerAccountRow {
  id: string;
}

interface DiscoveryRow {
  businessId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  themePrimaryColor: string | null;
  themeAccentColor: string | null;
  branchCount: number;
  programType: ProgramType | null;
  programVersion: number | null;
  membershipId: string | null;
  membershipStatus: MembershipStatus | null;
  branchName?: string | null;
  branchAddress?: string | null;
}

interface MembershipRow {
  id: string;
  businessId: string;
  status: MembershipStatus;
  joinedAt: Date;
  leftAt: Date | null;
  businessName: string;
  logoUrl: string | null;
  programType: ProgramType | null;
  programVersion: number | null;
}

interface MembershipEventRow {
  type: 'joined' | 'left';
  occurredAt: Date;
}

export interface CredentialRow {
  credential: string;
  shortCode: string;
  issuedAt: Date;
}

/**
 * GET response. `credential` and `shortCode` are null with
 * `requiresRotation: true` for a legacy (random) credential or one derived
 * under a different key: it cannot be shown and must be rotated once.
 */
export interface PersonalQrCredentialStatus {
  issuedAt: Date;
  active: true;
  credential: string | null;
  shortCode: string | null;
  requiresRotation?: true;
}

export interface BusinessDiscoveryResponse {
  business: {
    name: string;
    description: string | null;
    logoUrl: string | null;
    theme: {
      primaryColor: string | null;
      accentColor: string | null;
    };
    branchCount: number;
  };
  program: { type: ProgramType; version: number } | null;
  membership: { status: MembershipStatus } | null;
  branch?: { name: string; address: string | null };
}

@Injectable()
export class CustomerMembershipService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly ledger: LoyaltyLedgerService,
  ) {}

  discoverBusiness(
    userId: string,
    businessQrId: string,
  ): Promise<BusinessDiscoveryResponse> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const customer = await this.getCustomerAccount(connection, userId);
      const result = await connection.query<DiscoveryRow>(
        `SELECT b.id AS "businessId",
                b.name,
                b.description,
                b.logo_url AS "logoUrl",
                b.theme_primary_color AS "themePrimaryColor",
                b.theme_accent_color AS "themeAccentColor",
                b.branch_count AS "branchCount",
                p.type AS "programType",
                p.version AS "programVersion",
                m.id AS "membershipId",
                m.status AS "membershipStatus"
         FROM businesses b
         LEFT JOIN programs p
           ON p.business_id = b.id AND p.status = 'active'
         LEFT JOIN customer_business_memberships m
           ON m.business_id = b.id AND m.customer_account_id = $2
         WHERE b.public_qr_id = $1`,
        [businessQrId, customer.id],
      );
      return this.toDiscoveryResponse(result.rows[0]);
    });
  }

  discoverBranch(
    userId: string,
    branchQrId: string,
  ): Promise<BusinessDiscoveryResponse> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const customer = await this.getCustomerAccount(connection, userId);
      const result = await connection.query<DiscoveryRow>(
        `SELECT b.id AS "businessId",
                b.name,
                b.description,
                b.logo_url AS "logoUrl",
                b.theme_primary_color AS "themePrimaryColor",
                b.theme_accent_color AS "themeAccentColor",
                b.branch_count AS "branchCount",
                p.type AS "programType",
                p.version AS "programVersion",
                m.id AS "membershipId",
                m.status AS "membershipStatus",
                br.name AS "branchName",
                br.address AS "branchAddress"
         FROM branches br
         JOIN businesses b ON b.id = br.business_id
         LEFT JOIN programs p
           ON p.business_id = b.id AND p.status = 'active'
         LEFT JOIN customer_business_memberships m
           ON m.business_id = b.id AND m.customer_account_id = $2
         WHERE br.qr_code_id = $1`,
        [branchQrId, customer.id],
      );
      return this.toDiscoveryResponse(result.rows[0]);
    });
  }

  async joinBusiness(
    userId: string,
    input: JoinBusinessDto,
  ): Promise<Record<string, unknown>> {
    if (!input.businessQrId && !input.branchQrId) {
      throw new BadRequestException(
        'A business QR identifier or branch QR identifier is required',
      );
    }

    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const customer = await this.getCustomerAccount(connection, userId);
      const business = await this.resolveJoinBusiness(connection, input);
      const activeProgram = await connection.query<{ id: string }>(
        `SELECT id
         FROM programs
         WHERE business_id = $1 AND status = 'active'
         LIMIT 1`,
        [business.id],
      );
      if (!activeProgram.rows[0]) {
        throw new ConflictException(
          'This business does not have an active loyalty programme',
        );
      }

      const inserted = await connection.query<{ id: string }>(
        `INSERT INTO customer_business_memberships
           (customer_account_id, business_id, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT (customer_account_id, business_id) DO NOTHING
         RETURNING id`,
        [customer.id, business.id],
      );

      let membershipId = inserted.rows[0]?.id;
      if (membershipId) {
        await this.recordMembershipEvent(connection, membershipId, 'joined');
      } else {
        const existing = await connection.query<{
          id: string;
          status: MembershipStatus;
        }>(
          `SELECT id, status
           FROM customer_business_memberships
           WHERE customer_account_id = $1 AND business_id = $2
           FOR UPDATE`,
          [customer.id, business.id],
        );
        const membership = existing.rows[0];
        if (!membership) {
          throw new ConflictException('Membership could not be created');
        }
        membershipId = membership.id;
        if (membership.status === 'inactive') {
          await connection.query(
            `UPDATE customer_business_memberships
             SET status = 'active', left_at = NULL, updated_at = now()
             WHERE id = $1`,
            [membership.id],
          );
          await this.recordMembershipEvent(connection, membership.id, 'joined');
        }
      }

      return this.loadMembership(connection, customer.id, membershipId);
    });
  }

  listMemberships(userId: string): Promise<Record<string, unknown>[]> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const customer = await this.getCustomerAccount(connection, userId);
      const result = await connection.query<MembershipRow>(
        this.membershipSelect() +
          ` WHERE m.customer_account_id = $1
            ORDER BY m.joined_at DESC, m.id`,
        [customer.id],
      );
      return Promise.all(
        result.rows.map((row) => this.toMembershipResponse(connection, row)),
      );
    });
  }

  getMembership(
    userId: string,
    membershipId: string,
  ): Promise<Record<string, unknown>> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const customer = await this.getCustomerAccount(connection, userId);
      return this.loadMembership(connection, customer.id, membershipId);
    });
  }

  async leaveMembership(userId: string, membershipId: string) {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const customer = await this.getCustomerAccount(connection, userId);
      const membership = await connection.query<{
        id: string;
        status: MembershipStatus;
      }>(
        `SELECT id, status
         FROM customer_business_memberships
         WHERE id = $1 AND customer_account_id = $2
         FOR UPDATE`,
        [membershipId, customer.id],
      );
      const row = membership.rows[0];
      if (!row) {
        throw new NotFoundException('Membership not found');
      }
      if (row.status === 'active') {
        await connection.query(
          `UPDATE customer_business_memberships
           SET status = 'inactive', left_at = now(), updated_at = now()
           WHERE id = $1`,
          [row.id],
        );
        await this.recordMembershipEvent(connection, row.id, 'left');
      }
      return this.loadMembership(connection, customer.id, row.id);
    });
  }

  getPersonalQrCredential(userId: string): Promise<PersonalQrCredentialStatus> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const customer = await this.getCustomerAccount(connection, userId);
      const result = await connection.query<{
        id: string;
        credentialHash: string;
        issuedAt: Date;
      }>(
        `SELECT id, credential_hash AS "credentialHash", issued_at AS "issuedAt"
         FROM customer_qr_credentials
         WHERE customer_account_id = $1 AND revoked_at IS NULL`,
        [customer.id],
      );
      const row = result.rows[0];
      if (!row) {
        throw new NotFoundException('Personal QR credential has not been issued');
      }
      const codes = deriveCustomerQrCodes(customer.id, row.id);
      if (!verifyCustomerQrCredential(codes.credential, row.credentialHash)) {
        return {
          issuedAt: row.issuedAt,
          active: true,
          credential: null,
          shortCode: null,
          requiresRotation: true,
        };
      }
      return {
        issuedAt: row.issuedAt,
        active: true,
        credential: codes.credential,
        shortCode: codes.shortCode,
      };
    });
  }

  issuePersonalQrCredential(userId: string): Promise<CredentialRow> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const customer = await this.lockCustomerAccount(connection, userId);
      const existing = await this.readPersonalQrCredential(
        connection,
        customer.id,
      );
      if (existing) {
        throw new ConflictException(
          'A personal QR credential already exists. Rotate it to issue a new credential.',
        );
      }

      const credentialId = randomUUID();
      const codes = deriveCustomerQrCodes(customer.id, credentialId);
      const inserted = await connection.query<{ issuedAt: Date }>(
        `INSERT INTO customer_qr_credentials
           (id, customer_account_id, credential_hash, short_code_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (customer_account_id) WHERE revoked_at IS NULL DO NOTHING
         RETURNING issued_at AS "issuedAt"`,
        [credentialId, customer.id, codes.credentialHash, codes.shortCodeHash],
      );
      if (!inserted.rows[0]) {
        throw new ConflictException(
          'A personal QR credential was issued concurrently. Rotate it to issue a new credential.',
        );
      }
      return {
        credential: codes.credential,
        shortCode: codes.shortCode,
        issuedAt: inserted.rows[0].issuedAt,
      };
    });
  }

  rotatePersonalQrCredential(userId: string): Promise<CredentialRow> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const customer = await this.lockCustomerAccount(connection, userId);
      await connection.query(
        `UPDATE customer_qr_credentials
         SET revoked_at = now()
         WHERE customer_account_id = $1 AND revoked_at IS NULL`,
        [customer.id],
      );
      const credentialId = randomUUID();
      const codes = deriveCustomerQrCodes(customer.id, credentialId);
      const result = await connection.query<{ issuedAt: Date }>(
        `INSERT INTO customer_qr_credentials
           (id, customer_account_id, credential_hash, short_code_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING issued_at AS "issuedAt"`,
        [credentialId, customer.id, codes.credentialHash, codes.shortCodeHash],
      );
      return {
        credential: codes.credential,
        shortCode: codes.shortCode,
        issuedAt: result.rows[0].issuedAt,
      };
    });
  }

  private async getCustomerAccount(
    connection: PoolClient,
    userId: string,
  ): Promise<CustomerAccountRow> {
    const result = await connection.query<CustomerAccountRow>(
      `SELECT id
       FROM customer_accounts
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );
    const customer = result.rows[0];
    if (!customer) {
      throw new NotFoundException('Customer account not found');
    }
    return customer;
  }

  private async lockCustomerAccount(
    connection: PoolClient,
    userId: string,
  ): Promise<CustomerAccountRow> {
    const result = await connection.query<CustomerAccountRow>(
      `SELECT id
       FROM customer_accounts
       WHERE user_id = $1
       FOR UPDATE`,
      [userId],
    );
    const customer = result.rows[0];
    if (!customer) {
      throw new NotFoundException('Customer account not found');
    }
    return customer;
  }

  private async resolveJoinBusiness(
    connection: PoolClient,
    input: JoinBusinessDto,
  ): Promise<{ id: string }> {
    let result;
    if (input.businessQrId) {
      result = await connection.query<{ id: string }>(
        `SELECT b.id
         FROM businesses b
         WHERE b.public_qr_id = $1
           AND (
             $2::varchar IS NULL
             OR EXISTS (
               SELECT 1 FROM branches br
               WHERE br.business_id = b.id AND br.qr_code_id = $2
             )
           )
         LIMIT 1`,
        [input.businessQrId, input.branchQrId ?? null],
      );
    } else {
      result = await connection.query<{ id: string }>(
        `SELECT b.id
         FROM branches br
         JOIN businesses b ON b.id = br.business_id
         WHERE br.qr_code_id = $1
         LIMIT 1`,
        [input.branchQrId],
      );
    }
    const business = result.rows[0];
    if (!business) {
      throw new NotFoundException(
        'Business or branch QR identifier was not found',
      );
    }
    return business;
  }

  private toDiscoveryResponse(row: DiscoveryRow | undefined): BusinessDiscoveryResponse {
    if (!row) {
      throw new NotFoundException('Business QR identifier was not found');
    }
    const response: BusinessDiscoveryResponse = {
      business: {
        name: row.name,
        description: row.description,
        logoUrl: row.logoUrl,
        theme: {
          primaryColor: row.themePrimaryColor,
          accentColor: row.themeAccentColor,
        },
        branchCount: row.branchCount,
      },
      program:
        row.programType && row.programVersion !== null
          ? { type: row.programType, version: row.programVersion }
          : null,
      membership: row.membershipStatus
        ? { status: row.membershipStatus }
        : null,
    };
    if (row.branchName !== undefined) {
      response.branch = {
        name: row.branchName ?? '',
        address: row.branchAddress ?? null,
      };
    }
    return response;
  }

  private membershipSelect(): string {
    return `SELECT m.id,
                   m.business_id AS "businessId",
                   m.status,
                   m.joined_at AS "joinedAt",
                   m.left_at AS "leftAt",
                   b.name AS "businessName",
                   b.logo_url AS "logoUrl",
                   p.type AS "programType",
                   p.version AS "programVersion"
            FROM customer_business_memberships m
            JOIN businesses b ON b.id = m.business_id
            LEFT JOIN programs p
              ON p.business_id = b.id AND p.status = 'active'`;
  }

  private async loadMembership(
    connection: PoolClient,
    customerAccountId: string,
    membershipId: string,
  ): Promise<Record<string, unknown>> {
    const result = await connection.query<MembershipRow>(
      this.membershipSelect() +
        ` WHERE m.id = $1 AND m.customer_account_id = $2`,
      [membershipId, customerAccountId],
    );
    const membership = result.rows[0];
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    const events = await connection.query<MembershipEventRow>(
      `SELECT type, occurred_at AS "occurredAt"
       FROM membership_lifecycle_events
       WHERE membership_id = $1
       ORDER BY occurred_at, id`,
      [membership.id],
    );
    return {
      ...(await this.toMembershipResponse(connection, membership)),
      lifecycle: events.rows,
    };
  }

  /**
   * Balance (ledger sum) and rewards (active programme configurations) let the
   * customer card show progress without any client-side thresholds.
   */
  private async toMembershipResponse(
    connection: PoolClient,
    row: MembershipRow,
  ): Promise<Record<string, unknown>> {
    const balance = await this.ledger.getBalance(
      connection,
      row.businessId,
      row.id,
    );
    const configurations = await connection.query<ProgrammeConfiguration>(
      `SELECT pc.id, pc.type, pc.settings
       FROM program_configurations pc
       JOIN programs p ON p.id = pc.program_id
       WHERE p.business_id = $1 AND p.status = 'active'
       ORDER BY pc.type`,
      [row.businessId],
    );
    const rewards = configurations.rows.flatMap((configuration) =>
      listRewards(configuration).map(({ name, activityType, cost }) => ({
        name,
        activityType,
        cost,
      })),
    );
    return {
      id: row.id,
      status: row.status,
      joinedAt: row.joinedAt,
      leftAt: row.leftAt,
      business: { name: row.businessName, logoUrl: row.logoUrl },
      program: row.programType
        ? { type: row.programType, version: row.programVersion }
        : null,
      balance,
      rewards,
    };
  }

  private async recordMembershipEvent(
    connection: PoolClient,
    membershipId: string,
    type: 'joined' | 'left',
  ): Promise<void> {
    await connection.query(
      `INSERT INTO membership_lifecycle_events (membership_id, type)
       VALUES ($1, $2)`,
      [membershipId, type],
    );
  }

  private async readPersonalQrCredential(
    connection: PoolClient,
    customerAccountId: string,
  ): Promise<{ id: string } | undefined> {
    const result = await connection.query<{ id: string }>(
      `SELECT id
       FROM customer_qr_credentials
       WHERE customer_account_id = $1 AND revoked_at IS NULL`,
      [customerAccountId],
    );
    return result.rows[0];
  }
}
