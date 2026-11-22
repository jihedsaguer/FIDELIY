import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { TenantContextService } from '../../shared/database/tenant-context.service';
import { classifyCustomerQrInput } from '../../shared/security/customer-qr';
import { BusinessAccessService } from './business-access.service';
import {
  LIST_CUSTOMERS_DEFAULT_LIMIT,
  LIST_CUSTOMERS_MAX_LIMIT,
  ListCustomersQueryDto,
  MerchantCustomerListResponse,
} from './dto/list-customers.dto';

interface ResolvedCustomerRow {
  customerName: string;
  membershipStatus: 'active' | 'inactive' | null;
  joinedAt: Date | null;
}

interface ListRow {
  membershipId: string;
  customerName: string;
  phoneNumber: string;
  status: 'active' | 'inactive';
  joinedAt: Date;
  leftAt: Date | null;
  lastActivityAt: Date | null;
}

@Injectable()
export class MerchantCustomerService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

  resolveCustomerQr(userId: string, credential: string) {
    // Full credential or short ID (DECISIONS.md #20); the column is a fixed constant.
    const lookup = classifyCustomerQrInput(credential);
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const business = await this.getOwnedBusiness(connection, userId);
      const result = await connection.query<ResolvedCustomerRow>(
        `SELECT u.name AS "customerName",
                m.status AS "membershipStatus",
                m.joined_at AS "joinedAt"
         FROM customer_qr_credentials qr
         JOIN customer_accounts ca ON ca.id = qr.customer_account_id
         JOIN users u ON u.id = ca.user_id
         LEFT JOIN customer_business_memberships m
           ON m.customer_account_id = ca.id
          AND m.business_id = $2
         WHERE qr.${lookup.column} = $1
           AND qr.revoked_at IS NULL
         LIMIT 1`,
        [lookup.hash, business.id],
      );
      const customer = result.rows[0];
      if (!customer) {
        throw new NotFoundException('Customer QR credential is invalid or revoked');
      }
      if (customer.membershipStatus !== 'active' || !customer.joinedAt) {
        throw new ConflictException(
          'Customer must join this business before loyalty operations can continue',
        );
      }
      return {
        customer: { name: customer.customerName },
        membership: {
          status: customer.membershipStatus,
          joinedAt: customer.joinedAt,
        },
      };
    });
  }

  /**
   * Customers of the session merchant's business (one membership per row).
   * The business comes from the session user only. Balance is the ledger sum
   * (same source as LoyaltyLedgerService.getBalance), last activity is the
   * newest ledger transaction of the membership.
   */
  listCustomers(
    userId: string,
    query: ListCustomersQueryDto,
  ): Promise<MerchantCustomerListResponse> {
    const limit = Math.min(
      Math.max(Math.trunc(query.limit ?? LIST_CUSTOMERS_DEFAULT_LIMIT), 1),
      LIST_CUSTOMERS_MAX_LIMIT,
    );
    const offset = Math.max(Math.trunc(query.offset ?? 0), 0);
    const search = query.search?.trim();

    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const business = await this.getOwnedBusiness(connection, userId);

      const params: unknown[] = [business.id];
      let where = 'WHERE m.business_id = $1';
      if (query.status) {
        params.push(query.status);
        where += ` AND m.status = $${params.length}`;
      }
      if (search) {
        params.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
        where += ` AND (u.name ILIKE $${params.length} ESCAPE '\\' OR u.phone_number ILIKE $${params.length} ESCAPE '\\')`;
      }
      const from = `FROM customer_business_memberships m
         JOIN customer_accounts ca ON ca.id = m.customer_account_id
         JOIN users u ON u.id = ca.user_id`;

      const count = await connection.query<{ total: number | string }>(
        `SELECT COUNT(*)::int AS "total" ${from} ${where}`,
        params,
      );

      const page = await connection.query<ListRow>(
        `SELECT m.id AS "membershipId",
                u.name AS "customerName",
                u.phone_number AS "phoneNumber",
                m.status AS "status",
                m.joined_at AS "joinedAt",
                m.left_at AS "leftAt",
                (SELECT MAX(t.occurred_at)
                   FROM loyalty_transactions t
                  WHERE t.membership_id = m.id
                    AND t.business_id = m.business_id) AS "lastActivityAt"
         ${from}
         ${where}
         ORDER BY m.joined_at DESC, m.id ASC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      );

      const balances = new Map<string, { stamps: number; points: number }>();
      if (page.rows.length > 0) {
        const sums = await connection.query<{
          membershipId: string;
          activityType: string;
          balance: string | number;
        }>(
          `SELECT t.membership_id AS "membershipId",
                  e.activity_type AS "activityType",
                  SUM(e.delta)::bigint AS "balance"
           FROM loyalty_activity_entries e
           JOIN loyalty_transactions t ON t.id = e.transaction_id
           WHERE t.business_id = $1 AND t.membership_id = ANY($2::uuid[])
           GROUP BY t.membership_id, e.activity_type`,
          [business.id, page.rows.map((row) => row.membershipId)],
        );
        for (const row of sums.rows) {
          const entry = balances.get(row.membershipId) ?? { stamps: 0, points: 0 };
          if (row.activityType === 'stamps' || row.activityType === 'points') {
            entry[row.activityType] = Number(row.balance);
          }
          balances.set(row.membershipId, entry);
        }
      }

      return {
        total: Number(count.rows[0]?.total ?? 0),
        items: page.rows.map((row) => ({
          membershipId: row.membershipId,
          customer: { name: row.customerName, phoneNumber: row.phoneNumber },
          status: row.status,
          joinedAt: row.joinedAt,
          leftAt: row.leftAt,
          balance: balances.get(row.membershipId) ?? { stamps: 0, points: 0 },
          lastActivityAt: row.lastActivityAt,
        })),
      };
    });
  }

  private async getOwnedBusiness(
    connection: PoolClient,
    userId: string,
  ): Promise<{ id: string }> {
    const business = await this.businessAccess.findOwnedBusiness(
      connection,
      userId,
    );
    if (!business) {
      throw new NotFoundException('Business not found for this merchant');
    }
    return business;
  }
}
