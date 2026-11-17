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
export declare class CustomerBalanceService {
    private readonly tenantContext;
    constructor(tenantContext: TenantContextService);
    /**
     * Get current loyalty balances for a customer's membership.
     * Uses SQL aggregation to calculate the sum of all activity deltas.
     *
     * @param authenticatedUserId - The authenticated customer's user ID
     * @param membershipId - The customer's business membership ID
     * @returns Current stamps and points balances
     */
    getBalance(authenticatedUserId: string, membershipId: string): Promise<BalanceResult>;
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
    getTransactionHistory(authenticatedUserId: string, membershipId: string, limit?: number, offset?: number): Promise<TransactionHistoryItem[]>;
    /**
     * Get available rewards for a customer's membership.
     * Checks which rewards the customer can afford based on their current balances.
     * Returns empty array if rewards table doesn't exist yet.
     *
     * @param authenticatedUserId - The authenticated customer's user ID
     * @param membershipId - The customer's business membership ID
     * @returns Array of available rewards with affordability status
     */
    getAvailableRewards(authenticatedUserId: string, membershipId: string): Promise<RewardInfo[]>;
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
    redeemReward(authenticatedUserId: string, membershipId: string, rewardId: string, branchId?: string): Promise<{
        transactionId: string;
        oldBalance: BalanceResult;
        newBalance: BalanceResult;
    }>;
    /**
     * Get all memberships for a customer with their balances.
     *
     * @param authenticatedUserId - The authenticated customer's user ID
     * @returns Array of memberships with their current balances
     */
    getMembershipsWithBalances(authenticatedUserId: string): Promise<Array<{
        membershipId: string;
        businessId: string;
        businessName: string;
        logoUrl: string | null;
        status: 'active' | 'inactive';
        joinedAt: string;
        balance: BalanceResult;
        programType: 'stamps' | 'points' | 'both' | null;
    }>>;
    private validateMembership;
    private getBalanceInternal;
}
//# sourceMappingURL=customer-balance.service.d.ts.map