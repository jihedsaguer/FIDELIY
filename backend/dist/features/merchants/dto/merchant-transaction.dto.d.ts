/**
 * DTO for resolving a customer QR and preparing a loyalty transaction.
 */
export declare class ResolveCustomerForTransactionDto {
    /**
     * The customer's personal QR credential.
     */
    qrCredential: string;
    /**
     * Optional branch ID where the transaction is taking place.
     */
    branchId?: string;
}
/**
 * Response DTO for resolved customer information.
 */
export interface CustomerForTransactionResponse {
    customer: {
        id: string;
        name: string;
        phoneNumber: string;
    };
    membership: {
        id: string;
        status: 'active' | 'inactive';
        joinedAt: string;
    };
    balance: {
        stamps: number;
        points: number;
    };
    program: {
        id: string;
        type: 'stamps' | 'points' | 'both';
        version: number;
        name: string;
        configuration: {
            stamps?: {
                stampsPerPurchase: number;
                maxStampsPerTransaction: number;
            };
            points?: {
                pointsPerCurrencyUnit: number;
                currencyUnit: string;
                maxPointsPerTransaction: number;
            };
        };
    };
    eligibleRewards: Array<{
        id: string;
        name: string;
        pointsCost: number;
        stampsCost: number | null;
        available: boolean;
    }>;
}
/**
 * DTO for calculating loyalty earnings from a purchase.
 */
export declare class CalculateEarningsDto {
    /**
     * The resolved customer's membership ID.
     */
    membershipId: string;
    /**
     * The purchase amount in the business's currency.
     */
    purchaseAmount: number;
    /**
     * Optional branch ID where the purchase occurred.
     */
    branchId?: string;
}
/**
 * Response DTO for calculated loyalty earnings.
 */
export interface CalculateEarningsResponse {
    purchaseAmount: number;
    stampsToEarn: number;
    pointsToEarn: number;
    totalStampsAfter: number;
    totalPointsAfter: number;
    calculation: {
        stamps?: {
            stampsPerPurchase: number;
            transactionsCount: number;
        };
        points?: {
            pointsPerCurrencyUnit: number;
            calculation: string;
        };
    };
}
/**
 * DTO for creating a loyalty transaction.
 */
export declare class CreateLoyaltyTransactionDto {
    /**
     * The customer's membership ID.
     */
    membershipId: string;
    /**
     * The purchase amount.
     */
    purchaseAmount: number;
    /**
     * Stamps to award (if applicable).
     */
    stampsEarned?: number;
    /**
     * Points to award (if applicable).
     */
    pointsEarned?: number;
    /**
     * Optional branch ID.
     */
    branchId?: string;
    /**
     * Idempotency key to prevent duplicate transactions.
     * Will be generated if not provided.
     */
    idempotencyKey?: string;
}
/**
 * Response DTO for created loyalty transaction.
 */
export interface CreateLoyaltyTransactionResponse {
    transactionId: string;
    membershipId: string;
    purchaseAmount: number;
    stampsEarned: number;
    pointsEarned: number;
    newBalance: {
        stamps: number;
        points: number;
    };
    occurredAt: string;
    idempotencyKey: string;
}
/**
 * DTO for redeeming a reward.
 */
export declare class RedeemRewardDto {
    /**
     * The customer's membership ID.
     */
    membershipId: string;
    /**
     * The reward ID to redeem.
     */
    rewardId: string;
    /**
     * Optional branch ID where redemption occurs.
     */
    branchId?: string;
    /**
     * Idempotency key to prevent duplicate redemptions.
     */
    idempotencyKey?: string;
}
/**
 * Response DTO for reward redemption.
 */
export interface RedeemRewardResponse {
    redemptionId: string;
    reward: {
        id: string;
        name: string;
        pointsCost: number;
        stampsCost: number | null;
    };
    customerBalanceBefore: {
        stamps: number;
        points: number;
    };
    customerBalanceAfter: {
        stamps: number;
        points: number;
    };
    occurredAt: string;
}
/**
 * DTO for listing customer loyalty transactions.
 */
export declare class ListCustomerTransactionsDto {
    /**
     * The customer's membership ID.
     */
    membershipId: string;
    /**
     * Maximum number of transactions to return.
     */
    limit?: number;
    /**
     * Number of transactions to skip for pagination.
     */
    offset?: number;
}
/**
 * DTO for correcting/reversing a transaction.
 */
export declare class CorrectTransactionDto {
    /**
     * The original transaction ID to correct.
     */
    originalTransactionId: string;
    /**
     * The customer's membership ID.
     */
    membershipId: string;
    /**
     * Reason for the correction.
     */
    reason: string;
    /**
     * Optional branch ID.
     */
    branchId?: string;
}
//# sourceMappingURL=merchant-transaction.dto.d.ts.map