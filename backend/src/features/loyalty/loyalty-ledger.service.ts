import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { TenantContextService } from '../../shared/database/tenant-context.service';
import { BusinessAccessService } from '../merchants/business-access.service';

export type LoyaltyTransactionCategory =
  | 'purchase'
  | 'manual_adjustment'
  | 'reversal';

export type LoyaltyActivityType = 'stamps' | 'points';

export interface CreateLoyaltyLedgerEntry {
  activityType: LoyaltyActivityType;
  delta: number;
  programConfigurationId: string;
  reversesEntryId?: string;
}

export interface CreateLoyaltyTransaction {
  membershipId: string;
  branchId?: string;
  category: LoyaltyTransactionCategory;
  idempotencyKey: string;
  occurredAt?: Date;
  reversesTransactionId?: string;
  entries: CreateLoyaltyLedgerEntry[];
}

interface BusinessRow {
  id: string;
  merchantAccountId: string;
}

interface TransactionRow {
  id: string;
}

interface ActivityRow {
  id: string;
  activityType: LoyaltyActivityType;
  delta: number;
  programConfigurationId: string;
  reversesEntryId: string | null;
}

@Injectable()
export class LoyaltyLedgerService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

  async createTransaction(
    authenticatedUserId: string,
    input: CreateLoyaltyTransaction,
  ): Promise<{ id: string; entries: ActivityRow[] }> {
    this.validateInput(input);
    const fingerprint = this.fingerprint(input);

    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      (connection) =>
        this.createWithinTransaction(
          connection,
          authenticatedUserId,
          input,
          fingerprint,
        ),
      { isolationLevel: 'serializable', serializationRetries: 3 },
    );
  }

  private async createWithinTransaction(
    connection: PoolClient,
    userId: string,
    input: CreateLoyaltyTransaction,
    fingerprint: string,
  ): Promise<{ id: string; entries: ActivityRow[] }> {
    const business = await this.getOwnedBusiness(connection, userId);
    const existing = await this.findByIdempotencyKey(
      connection,
      business.id,
      input.idempotencyKey,
    );
    if (existing) {
      return this.returnIdempotentResult(
        connection,
        existing,
        fingerprint,
      );
    }

    await this.validateMembership(connection, business.id, input.membershipId);
    await this.validateBranch(connection, business.id, input.branchId);
    await this.validateConfigurations(
      connection,
      business.id,
      input.entries,
      input.category !== 'reversal',
    );
    await this.validateReversal(connection, business.id, input);

    const inserted = await connection.query<TransactionRow>(
      `INSERT INTO loyalty_transactions
         (business_id, membership_id, branch_id, merchant_account_id,
          category, occurred_at, idempotency_key, request_fingerprint,
          reverses_transaction_id)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()), $7, $8, $9)
       ON CONFLICT (business_id, idempotency_key) DO NOTHING
       RETURNING id`,
      [
        business.id,
        input.membershipId,
        input.branchId ?? null,
        business.merchantAccountId,
        input.category,
        input.occurredAt ?? null,
        input.idempotencyKey,
        fingerprint,
        input.reversesTransactionId ?? null,
      ],
    );

    if (!inserted.rows[0]) {
      const concurrent = await this.findByIdempotencyKey(
        connection,
        business.id,
        input.idempotencyKey,
      );
      if (!concurrent) {
        throw new ConflictException(
          'Concurrent idempotent transaction could not be resolved',
        );
      }
      return this.returnIdempotentResult(
        connection,
        concurrent,
        fingerprint,
      );
    }

    const entries: ActivityRow[] = [];
    for (const entry of input.entries) {
      const result = await connection.query<ActivityRow>(
        `INSERT INTO loyalty_activity_entries
           (transaction_id, activity_type, delta, program_configuration_id,
            reverses_entry_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, activity_type AS "activityType", delta,
                   program_configuration_id AS "programConfigurationId",
                   reverses_entry_id AS "reversesEntryId"`,
        [
          inserted.rows[0].id,
          entry.activityType,
          entry.delta,
          entry.programConfigurationId,
          entry.reversesEntryId ?? null,
        ],
      );
      entries.push(result.rows[0]);
    }

    return { id: inserted.rows[0].id, entries };
  }

  private async getOwnedBusiness(
    connection: PoolClient,
    userId: string,
  ): Promise<BusinessRow> {
    const business = await this.businessAccess.shareOwnedBusiness(
      connection,
      userId,
    );
    if (!business) {
      throw new NotFoundException('Business not found for this merchant');
    }
    return business;
  }

  private async findByIdempotencyKey(
    connection: PoolClient,
    businessId: string,
    idempotencyKey: string,
  ): Promise<{ id: string; requestFingerprint: string } | undefined> {
    const result = await connection.query<{
      id: string;
      requestFingerprint: string;
    }>(
      `SELECT id, request_fingerprint AS "requestFingerprint"
       FROM loyalty_transactions
       WHERE business_id = $1 AND idempotency_key = $2`,
      [businessId, idempotencyKey],
    );
    return result.rows[0];
  }

  private async returnIdempotentResult(
    connection: PoolClient,
    existing: { id: string; requestFingerprint: string },
    fingerprint: string,
  ): Promise<{ id: string; entries: ActivityRow[] }> {
    if (existing.requestFingerprint !== fingerprint) {
      throw new ConflictException(
        'Idempotency key was already used with a different request',
      );
    }
    const result = await connection.query<ActivityRow>(
      `SELECT id, activity_type AS "activityType", delta,
              program_configuration_id AS "programConfigurationId",
              reverses_entry_id AS "reversesEntryId"
       FROM loyalty_activity_entries
       WHERE transaction_id = $1
       ORDER BY created_at, id`,
      [existing.id],
    );
    return { id: existing.id, entries: result.rows };
  }

  private async validateMembership(
    connection: PoolClient,
    businessId: string,
    membershipId: string,
  ): Promise<void> {
    const result = await connection.query(
      `SELECT id
       FROM customer_business_memberships
       WHERE id = $1 AND business_id = $2 AND status = 'active'
       FOR UPDATE`,
      [membershipId, businessId],
    );
    if (!result.rows[0]) {
      throw new NotFoundException(
        'Active customer membership was not found for this business',
      );
    }
  }

  private async validateBranch(
    connection: PoolClient,
    businessId: string,
    branchId: string | undefined,
  ): Promise<void> {
    if (!branchId) return;
    const result = await connection.query(
      'SELECT id FROM branches WHERE id = $1 AND business_id = $2 FOR SHARE',
      [branchId, businessId],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Branch not found for this business');
    }
  }

  private async validateConfigurations(
    connection: PoolClient,
    businessId: string,
    entries: CreateLoyaltyLedgerEntry[],
    requireActiveProgram: boolean,
  ): Promise<void> {
    for (const entry of entries) {
      const result = await connection.query(
        `SELECT pc.id
         FROM program_configurations pc
         JOIN programs p ON p.id = pc.program_id
         WHERE pc.id = $1
           AND pc.type = $2
           AND p.business_id = $3
           AND ($4::boolean = false OR p.status = 'active')
         FOR SHARE OF pc, p`,
        [
          entry.programConfigurationId,
          entry.activityType,
          businessId,
          requireActiveProgram,
        ],
      );
      if (!result.rows[0]) {
        throw new BadRequestException(
          'Activity configuration is not active for this business and activity type',
        );
      }
    }
  }

  private async validateReversal(
    connection: PoolClient,
    businessId: string,
    input: CreateLoyaltyTransaction,
  ): Promise<void> {
    if (input.category !== 'reversal') return;
    const transaction = await connection.query<{
      id: string;
      category: LoyaltyTransactionCategory;
    }>(
      `SELECT id, category
       FROM loyalty_transactions
       WHERE id = $1 AND business_id = $2 AND membership_id = $3
       FOR SHARE`,
      [
        input.reversesTransactionId,
        businessId,
        input.membershipId,
      ],
    );
    const origTx = transaction.rows[0];
    if (!origTx) {
      throw new NotFoundException(
        'Transaction to reverse was not found for this membership',
      );
    }

    if (origTx.category === 'reversal') {
      throw new BadRequestException(
        'Cannot reverse a reversal transaction',
      );
    }

    const existingReversal = await connection.query<{ id: string }>(
      `SELECT id
       FROM loyalty_transactions
       WHERE reverses_transaction_id = $1`,
      [input.reversesTransactionId],
    );
    if (existingReversal.rows[0]) {
      throw new ConflictException(
        'Transaction has already been reversed',
      );
    }

    const originalEntriesResult = await connection.query<{
      id: string;
      activityType: LoyaltyActivityType;
      delta: number;
      programConfigurationId: string;
    }>(
      `SELECT id,
              activity_type AS "activityType",
              delta,
              program_configuration_id AS "programConfigurationId"
       FROM loyalty_activity_entries
       WHERE transaction_id = $1
       ORDER BY id`,
      [input.reversesTransactionId],
    );
    const originalEntries = originalEntriesResult.rows;

    if (input.entries.length !== originalEntries.length) {
      throw new BadRequestException(
        'Full reversal must reverse all entries of the original transaction',
      );
    }

    const seenReversesEntryIds = new Set<string>();

    for (const entry of input.entries) {
      if (!entry.reversesEntryId) {
        throw new BadRequestException(
          'Each reversal activity entry must reference an original entry',
        );
      }

      if (seenReversesEntryIds.has(entry.reversesEntryId)) {
        throw new BadRequestException(
          'Duplicate reversal entry reference in reversal request',
        );
      }
      seenReversesEntryIds.add(entry.reversesEntryId);

      const originalEntry = originalEntries.find(
        (orig) => orig.id === entry.reversesEntryId,
      );

      if (!originalEntry) {
        throw new BadRequestException(
          'Reversal entry must reference an original entry belonging to the reversed transaction',
        );
      }

      if (entry.activityType !== originalEntry.activityType) {
        throw new BadRequestException(
          'Reversal entry activity type does not match original entry',
        );
      }

      if (entry.programConfigurationId !== originalEntry.programConfigurationId) {
        throw new BadRequestException(
          'Reversal entry program configuration does not match original entry',
        );
      }

      if (entry.delta !== -originalEntry.delta) {
        throw new BadRequestException(
          'Reversal entry delta must be the exact inverse of the original entry delta',
        );
      }
    }

    const entryIds = Array.from(seenReversesEntryIds);
    const alreadyReversedEntries = await connection.query<{ reverses_entry_id: string }>(
      `SELECT reverses_entry_id
       FROM loyalty_activity_entries
       WHERE reverses_entry_id = ANY($1::uuid[])`,
      [entryIds],
    );
    if (alreadyReversedEntries.rows[0]) {
      throw new ConflictException(
        'One or more entries have already been reversed',
      );
    }
  }

  private validateInput(input: CreateLoyaltyTransaction): void {
    if (
      typeof input.idempotencyKey !== 'string' ||
      input.idempotencyKey.length < 1 ||
      input.idempotencyKey.length > 128
    ) {
      throw new BadRequestException(
        'Idempotency key must contain between 1 and 128 characters',
      );
    }
    if (!input.entries.length) {
      throw new BadRequestException(
        'A loyalty transaction must contain at least one activity entry',
      );
    }
    if (
      (input.category === 'reversal') !==
      Boolean(input.reversesTransactionId)
    ) {
      throw new BadRequestException(
        'Only reversal transactions may reference an original transaction',
      );
    }
    if (input.occurredAt && Number.isNaN(input.occurredAt.getTime())) {
      throw new BadRequestException('Occurrence time must be a valid date');
    }
    for (const entry of input.entries) {
      if (
        !Number.isSafeInteger(entry.delta) ||
        entry.delta === 0 ||
        !['stamps', 'points'].includes(entry.activityType)
      ) {
        throw new BadRequestException('Invalid loyalty activity entry');
      }
      if (input.category !== 'reversal' && entry.reversesEntryId) {
        throw new BadRequestException(
          'Only reversal transactions may reference a reversal entry',
        );
      }
    }
  }

  private fingerprint(input: CreateLoyaltyTransaction): string {
    const canonical = JSON.stringify({
      membershipId: input.membershipId,
      branchId: input.branchId ?? null,
      category: input.category,
      occurredAt: input.occurredAt?.toISOString() ?? null,
      reversesTransactionId: input.reversesTransactionId ?? null,
      entries: [...input.entries]
        .map((entry) => ({
          activityType: entry.activityType,
          delta: entry.delta,
          programConfigurationId: entry.programConfigurationId,
          reversesEntryId: entry.reversesEntryId ?? null,
        }))
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        ),
    });
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
  }
}
