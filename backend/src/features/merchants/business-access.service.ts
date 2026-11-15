import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

export interface OwnedBusinessRef {
  id: string;
}

export interface SharedOwnedBusiness extends OwnedBusinessRef {
  merchantAccountId: string;
}

const FIND_OWNED_BUSINESS_SQL = `SELECT b.id
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       LIMIT 1`;

const LOCK_OWNED_BUSINESS_SQL = `SELECT b.id
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       FOR UPDATE OF b`;

const SHARE_OWNED_BUSINESS_SQL = `SELECT b.id, b.merchant_id AS "merchantAccountId"
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       FOR SHARE OF b, ma`;

/**
 * Merchant-owned business lookups. Runs on the caller's transaction
 * and does not open a TenantContext of its own.
 */
@Injectable()
export class BusinessAccessService {
  async findOwnedBusiness(
    connection: PoolClient,
    userId: string,
  ): Promise<OwnedBusinessRef | null> {
    const result = await connection.query<OwnedBusinessRef>(
      FIND_OWNED_BUSINESS_SQL,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async lockOwnedBusinessForUpdate(
    connection: PoolClient,
    userId: string,
  ): Promise<OwnedBusinessRef | null> {
    const result = await connection.query<OwnedBusinessRef>(
      LOCK_OWNED_BUSINESS_SQL,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async shareOwnedBusiness(
    connection: PoolClient,
    userId: string,
  ): Promise<SharedOwnedBusiness | null> {
    const result = await connection.query<SharedOwnedBusiness>(
      SHARE_OWNED_BUSINESS_SQL,
      [userId],
    );
    return result.rows[0] ?? null;
  }
}
