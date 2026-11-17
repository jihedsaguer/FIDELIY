import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import type { PoolClient } from 'pg';
import { TenantContextService } from '../../shared/database/tenant-context.service';

export type LoyaltyActivityType = 'stamps' | 'points';

export interface BalanceResult {
  stamps: number;
  points: number;
}

export interface TransactionHistoryItem {
  id: string;
  occurredAt: string;
  category: 'purchase' | 'manual_adjustment' | 'reversal';
  stampsDelta: number;
  pointsDelta: number;
  stampsBalance: number;
  pointsBalance: number;
  branchName?: string;
  branchId?: string;
}

export interface RewardInfo {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  stampsCost: number | null;
  available: boolean;
}

@Injectable()
export class CustomerBalanceService {
  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Get current loyalty balances for a customer's membership.
   * Uses SQL aggregation to calculate the sum of all activity deltas.
   * 
   * @param authenticatedUserId - The authenticated customer's user ID
   * @param membershipId - The customer's business membership ID
   * @returns Current stamps and points balances
   */
  async getBalance(
    authenticatedUserId: string,
    membershipId: string,
  ): Promise<BalanceResult> {
    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        // Verify membership belongs to this customer
        await this.validateMembership(connection, authenticatedUserId, membershipId);

        const result = await connection.query<{
          totalStamps: string | null;
          totalPoints: string | null;
        }>(
          `SELECT 
             COALESCE(SUM(
               CASE WHEN lae.activity_type = 'stamps' THEN lae.delta ELSE 0 END
             ), 0)::integer AS "totalStamps",
             COALESCE(SUM(
               CASE WHEN lae.activity_type = 'points' THEN lae.delta ELSE 0 END
             ), 0)::integer AS "totalPoints"
           FROM loyalty_activity_entries lae
           JOIN loyalty_transactions lt ON lt.id = lae.transaction_id
           WHERE lt.membership_id = $1`,
          [membershipId],
        );

        return {
          stamps: result.rows[0]?.totalStamps ? parseInt(result.rows[0].totalStamps, 10) : 0,
          points: result.rows[0]?.totalPoints ? parseInt(result.rows[0].totalPoints, 10) : 0,
        };
      },
    );
  }

  /**
   * Get transaction history for a customer's membership.
   * Returns transactions with running balances.
   * 
   * @param authenticatedUserId - The authenticated customer's user ID
   * @param membershipId - The customer's business membership ID
   * @param limit - Maximum number of transactions to return (default: 50)
   * @param offset - Offset for pagination (default: 0)
   * @returns Array of transaction history items with running balances
   */
  async getTransactionHistory(
    authenticatedUserId: string,
    membershipId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<TransactionHistoryItem[]> {
    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        // Verify membership belongs to this customer
        await this.validateMembership(connection, authenticatedUserId, membershipId);

        // Get transactions with their entries
        const transactionsResult = await connection.query<{
          transactionId: string;
          occurredAt: string;
          category: string;
          branchId: string | null;
          branchName: string | null;
        }>(
          `SELECT 
             lt.id AS "transactionId",
             lt.occurred_at AS "occurredAt",
             lt.category,
             lt.branch_id AS "branchId",
             br.name AS "branchName"
           FROM loyalty_transactions lt
           LEFT JOIN branches br ON br.id = lt.branch_id
           WHERE lt.membership_id = $1
           ORDER BY lt.occurred_at DESC, lt.created_at DESC, lt.id
           LIMIT $2 OFFSET $3`,
          [membershipId, limit, offset],
        );

        if (transactionsResult.rows.length === 0) {
          return [];
        }

        const transactionIds = transactionsResult.rows.map((row) => row.transactionId);

        // Get all entries for these transactions
        const entriesResult = await connection.query<{
          transactionId: string;
          activityType: LoyaltyActivityType;
          delta: number;
        }>(
          `SELECT 
             transaction_id AS "transactionId",
             activity_type AS "activityType",
             delta
           FROM loyalty_activity_entries
           WHERE transaction_id = ANY($1::uuid[])
           ORDER BY transaction_id, created_at, id`,
          [transactionIds],
        );

        // Calculate running balances
        const transactionsMap = new Map<string, TransactionHistoryItem>();
        let runningStamps = 0;
        let runningPoints = 0;

        // Process transactions in chronological order (oldest first)
        const sortedTransactions = [...transactionsResult.rows].reverse();

        for (const tx of sortedTransactions) {
          // Get entries for this transaction
          const txEntries = entriesResult.rows.filter(
            (e) => e.transactionId === tx.transactionId,
          );

          // Calculate deltas
          let stampsDelta = 0;
          let pointsDelta = 0;

          for (const entry of txEntries) {
            if (entry.activityType === 'stamps') {
              stampsDelta += entry.delta;
            } else if (entry.activityType === 'points') {
              pointsDelta += entry.delta;
            }
          }

          // Update running balances
          runningStamps += stampsDelta;
          runningPoints += pointsDelta;

          transactionsMap.set(tx.transactionId, {
            id: tx.transactionId,
            occurredAt: tx.occurredAt,
            category: tx.category as 'purchase' | 'manual_adjustment' | 'reversal',
            stampsDelta,
            pointsDelta,
            stampsBalance: runningStamps,
            pointsBalance: runningPoints,
            branchId: tx.branchId ?? undefined,
            branchName: tx.branchName ?? undefined,
          });
        }

        // Return in reverse chronological order (newest first)
        return sortedTransactions
          .reverse()
          .map((tx) => transactionsMap.get(tx.transactionId)!);
      },
    );
  }

  /**
   * Get available rewards for a customer's membership.
   * Checks which rewards the customer can afford based on their current balances.
   * Returns empty array if rewards table doesn't exist yet.
   * 
   * @param authenticatedUserId - The authenticated customer's user ID
   * @param membershipId - The customer's business membership ID
   * @returns Array of available rewards with affordability status
   */
  async getAvailableRewards(
    authenticatedUserId: string,
    membershipId: string,
  ): Promise<RewardInfo[]> {
    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        // Verify membership belongs to this customer
        await this.validateMembership(connection, authenticatedUserId, membershipId);

        // Get current balances
        const balance = await this.getBalanceInternal(
          connection,
          authenticatedUserId,
          membershipId,
        );

        try {
          // Try to get rewards from the business's active programme
          const rewardsResult = await connection.query<{
            id: string;
            name: string;
            description: string | null;
            pointsCost: number;
            stampsCost: number | null;
            programId: string;
          }>(
            `SELECT 
               r.id,
               r.name,
               r.description,
               r.points_cost AS "pointsCost",
               r.stamps_cost AS "stampsCost"
             FROM rewards r
             JOIN programs p ON p.id = r.program_id
             JOIN loyalty_transactions lt ON lt.membership_id = $1
             JOIN businesses b ON b.id = lt.business_id
             WHERE p.business_id = b.id AND p.status = 'active' AND r.is_active = true
             ORDER BY r.points_cost ASC, r.name`,
            [membershipId],
          );

          return rewardsResult.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            pointsCost: row.pointsCost,
            stampsCost: row.stampsCost ?? null,
            available:
              (row.stampsCost === null || balance.stamps >= row.stampsCost) &&
              balance.points >= row.pointsCost,
          }));
        } catch (error) {
          // Rewards table might not exist yet
          console.warn('[CustomerBalanceService] Rewards table not available:', error);
          return [];
        }
      },
    );
  }

  /**
   * Redeem a reward for a customer's membership.
   * This is a simplified version - actual redemption would go through the loyalty ledger.
   * 
   * @param authenticatedUserId - The authenticated customer's user ID
   * @param membershipId - The customer's business membership ID
   * @param rewardId - The reward ID to redeem
   * @param branchId - Optional branch ID for the redemption
   * @returns The created transaction and updated balances
   */
  async redeemReward(
    authenticatedUserId: string,
    membershipId: string,
    rewardId: string,
    branchId?: string,
  ): Promise<{ transactionId: string; oldBalance: BalanceResult; newBalance: BalanceResult }> {
    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        // Verify membership belongs to this customer
        await this.validateMembership(connection, authenticatedUserId, membershipId);

        // Get reward information
        // Note: rewards table may not exist yet per architectural constraints
        let reward: {
          id: string;
          name: string;
          pointsCost: number;
          stampsCost: number | null;
          programId: string;
        } | null = null;

        try {
          const rewardResult = await connection.query<{
            id: string;
            name: string;
            pointsCost: number;
            stampsCost: number | null;
            programId: string;
          }>(
            `SELECT 
               r.id,
               r.name,
               r.points_cost AS "pointsCost",
               r.stamps_cost AS "stampsCost",
               r.program_id AS "programId"
             FROM rewards r
             JOIN programs p ON p.id = r.program_id
             JOIN loyalty_transactions lt ON lt.membership_id = $1
             JOIN businesses b ON b.id = lt.business_id
             WHERE r.id = $2 AND p.business_id = b.id AND p.status = 'active' AND r.is_active = true
             LIMIT 1`,
            [membershipId, rewardId],
          );

          reward = rewardResult.rows[0] ?? null;
        } catch (error) {
          // Rewards table does not exist - rewards not yet implemented
          console.warn('[CustomerBalanceService] Rewards table not available:', error);
          reward = null;
        }

        if (!reward) {
          throw new Error('Reward not found for this membership');
        }

        // Get current balances
        const oldBalance = await this.getBalanceInternal(
          connection,
          authenticatedUserId,
          membershipId,
        );

        // Check if customer can afford the reward
        const canAfford =
          (reward.stampsCost === null || oldBalance.stamps >= reward.stampsCost) &&
          oldBalance.points >= reward.pointsCost;

        if (!canAfford) {
          throw new Error('Insufficient balance for this reward');
        }

        // Get program configuration IDs for the reward
        const configResult = await connection.query<{
          stampsConfigId: string | null;
          pointsConfigId: string | null;
        }>(
          `SELECT 
             (SELECT id FROM program_configurations 
              WHERE program_id = $1 AND type = 'stamps' LIMIT 1) AS "stampsConfigId",
             (SELECT id FROM program_configurations 
              WHERE program_id = $1 AND type = 'points' LIMIT 1) AS "pointsConfigId"`,
          [reward.programId],
        );

        const stampsConfigId = configResult.rows[0]?.stampsConfigId;
        const pointsConfigId = configResult.rows[0]?.pointsConfigId;

        if (!pointsConfigId) {
          throw new Error('Points configuration not found for this programme');
        }

        // Create redemption transaction
        const transactionId = crypto.randomUUID();

        // Calculate new balances
        const newBalance = {
          stamps:
            reward.stampsCost !== null
              ? oldBalance.stamps - reward.stampsCost
              : oldBalance.stamps,
          points: oldBalance.points - reward.pointsCost,
        };

        // Note: In a real implementation, this would use the LoyaltyLedgerService
        // For now, we return the calculated values
        // The actual loyalty transaction creation would be handled by the merchant flow

        return {
          transactionId,
          oldBalance,
          newBalance,
        };
      },
    );
  }

  /**
   * Get all memberships for a customer with their balances.
   * 
   * @param authenticatedUserId - The authenticated customer's user ID
   * @returns Array of memberships with their current balances
   */
  async getMembershipsWithBalances(
    authenticatedUserId: string,
  ): Promise<
    Array<{
      membershipId: string;
      businessId: string;
      businessName: string;
      logoUrl: string | null;
      status: 'active' | 'inactive';
      joinedAt: string;
      balance: BalanceResult;
      programType: 'stamps' | 'points' | 'both' | null;
    }>
  > {
    return this.tenantContext.executeWithContext(
      authenticatedUserId,
      async (connection) => {
        // Get customer account
        const customerResult = await connection.query<{ id: string }>(
          `SELECT id FROM customer_accounts WHERE user_id = $1 LIMIT 1`,
          [authenticatedUserId],
        );

        if (!customerResult.rows[0]) {
          throw new Error('Customer account not found');
        }

        const customerAccountId = customerResult.rows[0].id;

        // Get all memberships
        const membershipsResult = await connection.query<{
          id: string;
          businessId: string;
          businessName: string;
          logoUrl: string | null;
          status: 'active' | 'inactive';
          joinedAt: string;
          programType: 'stamps' | 'points' | 'both' | null;
        }>(
          `SELECT 
             m.id AS "id",
             m.business_id AS "businessId",
             b.name AS "businessName",
             b.logo_url AS "logoUrl",
             m.status,
             m.joined_at AS "joinedAt",
             p.type AS "programType"
           FROM customer_business_memberships m
           JOIN businesses b ON b.id = m.business_id
           LEFT JOIN programs p ON p.business_id = b.id AND p.status = 'active'
           WHERE m.customer_account_id = $1 AND m.status = 'active'
           ORDER BY m.joined_at DESC, m.id`,
          [customerAccountId],
        );

        if (membershipsResult.rows.length === 0) {
          return [];
        }

        // Get balances for each membership
        const membershipBalances: Map<string, BalanceResult> = new Map();

        const balancesResult = await connection.query<{
          membershipId: string;
          totalStamps: string;
          totalPoints: string;
        }>(
          `SELECT 
             lt.membership_id AS "membershipId",
             COALESCE(SUM(
               CASE WHEN lae.activity_type = 'stamps' THEN lae.delta ELSE 0 END
             ), 0)::integer AS "totalStamps",
             COALESCE(SUM(
               CASE WHEN lae.activity_type = 'points' THEN lae.delta ELSE 0 END
             ), 0)::integer AS "totalPoints"
           FROM loyalty_transactions lt
           JOIN loyalty_activity_entries lae ON lae.transaction_id = lt.id
           WHERE lt.membership_id = ANY($1::uuid[])
           GROUP BY lt.membership_id`,
          [membershipsResult.rows.map((row) => row.id)],
        );

        for (const row of balancesResult.rows) {
          membershipBalances.set(row.membershipId, {
            stamps: parseInt(row.totalStamps, 10),
            points: parseInt(row.totalPoints, 10),
          });
        }

        return membershipsResult.rows.map((membership) => ({
          membershipId: membership.id,
          businessId: membership.businessId,
          businessName: membership.businessName,
          logoUrl: membership.logoUrl,
          status: membership.status,
          joinedAt: membership.joinedAt,
          balance: membershipBalances.get(membership.id) ?? { stamps: 0, points: 0 },
          programType: membership.programType,
        }));
      },
    );
  }

  private async validateMembership(
    connection: PoolClient,
    authenticatedUserId: string,
    membershipId: string,
  ): Promise<void> {
    const result = await connection.query(
      `SELECT m.id
       FROM customer_business_memberships m
       JOIN customer_accounts ca ON ca.id = m.customer_account_id
       JOIN users u ON u.id = ca.user_id
       WHERE m.id = $1 AND u.id = $2 AND m.status = 'active'
       LIMIT 1`,
      [membershipId, authenticatedUserId],
    );

    if (!result.rows[0]) {
      throw new Error('Membership not found or not accessible');
    }
  }

  private async getBalanceInternal(
    connection: PoolClient,
    authenticatedUserId: string,
    membershipId: string,
  ): Promise<BalanceResult> {
    const result = await connection.query<{
      totalStamps: string | null;
      totalPoints: string | null;
    }>(
      `SELECT 
         COALESCE(SUM(
           CASE WHEN lae.activity_type = 'stamps' THEN lae.delta ELSE 0 END
         ), 0)::integer AS "totalStamps",
         COALESCE(SUM(
           CASE WHEN lae.activity_type = 'points' THEN lae.delta ELSE 0 END
         ), 0)::integer AS "totalPoints"
       FROM loyalty_activity_entries lae
       JOIN loyalty_transactions lt ON lt.id = lae.transaction_id
       WHERE lt.membership_id = $1`,
      [membershipId],
    );

    return {
      stamps: result.rows[0]?.totalStamps ? parseInt(result.rows[0].totalStamps, 10) : 0,
      points: result.rows[0]?.totalPoints ? parseInt(result.rows[0].totalPoints, 10) : 0,
    };
  }
}
