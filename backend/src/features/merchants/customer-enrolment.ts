import type { PoolClient } from 'pg';

export type EnrolmentOutcome = 'existing' | 'joined' | 'rejoined';

export interface EnsuredMembership {
  membershipId: string;
  status: 'active';
  joinedAt: string;
  enrolment: EnrolmentOutcome;
}

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

async function recordJoined(connection: PoolClient, membershipId: string): Promise<void> {
  await connection.query(
    `INSERT INTO membership_lifecycle_events (membership_id, type)
     VALUES ($1, $2)`,
    [membershipId, 'joined'],
  );
}

/**
 * Makes sure the customer is an active member of the business (DECISIONS.md #21).
 * Idempotent and race-safe: a concurrent insert falls back to the existing row,
 * which is locked before an inactive membership is reactivated in place
 * (joined_at is unchanged). The caller must already have verified that the
 * business has an active programme. Runs on the caller's connection.
 */
export async function ensureActiveMembership(
  connection: PoolClient,
  customerAccountId: string,
  businessId: string,
): Promise<EnsuredMembership> {
  const inserted = await connection.query<{ id: string; joinedAt: Date | string }>(
    `INSERT INTO customer_business_memberships
       (customer_account_id, business_id, status, joined_at, created_at, updated_at)
     VALUES ($1, $2, 'active', now(), now(), now())
     ON CONFLICT (customer_account_id, business_id) DO NOTHING
     RETURNING id, joined_at AS "joinedAt"`,
    [customerAccountId, businessId],
  );
  const created = inserted.rows[0];
  if (created) {
    await recordJoined(connection, created.id);
    return {
      membershipId: created.id,
      status: 'active',
      joinedAt: toIso(created.joinedAt),
      enrolment: 'joined',
    };
  }

  const existing = await connection.query<{
    id: string;
    status: 'active' | 'inactive';
    joinedAt: Date | string;
  }>(
    `SELECT id, status, joined_at AS "joinedAt"
     FROM customer_business_memberships
     WHERE customer_account_id = $1 AND business_id = $2
     FOR UPDATE`,
    [customerAccountId, businessId],
  );
  const membership = existing.rows[0];
  if (!membership) {
    throw new Error('Membership could not be created or retrieved');
  }
  if (membership.status === 'active') {
    return {
      membershipId: membership.id,
      status: 'active',
      joinedAt: toIso(membership.joinedAt),
      enrolment: 'existing',
    };
  }

  const reactivated = await connection.query<{ id: string; joinedAt: Date | string }>(
    `UPDATE customer_business_memberships
     SET status = 'active', left_at = NULL, updated_at = now()
     WHERE id = $1 AND status = 'inactive'
     RETURNING id, joined_at AS "joinedAt"`,
    [membership.id],
  );
  if (!reactivated.rows[0]) {
    // Reactivated concurrently between the lock and the update; nothing to add.
    return {
      membershipId: membership.id,
      status: 'active',
      joinedAt: toIso(membership.joinedAt),
      enrolment: 'existing',
    };
  }
  await recordJoined(connection, membership.id);
  return {
    membershipId: membership.id,
    status: 'active',
    joinedAt: toIso(reactivated.rows[0].joinedAt),
    enrolment: 'rejoined',
  };
}
