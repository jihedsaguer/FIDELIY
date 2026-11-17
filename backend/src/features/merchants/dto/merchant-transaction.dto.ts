import { IsString, IsUUID, IsNumber, IsOptional, IsPositive, Min, Max, IsDateString, IsNotEmpty } from 'class-validator';

/**
 * DTO for resolving a customer QR and preparing a loyalty transaction.
 */
export class ResolveCustomerForTransactionDto {
  /**
   * The customer's personal QR credential.
   */
  @IsString()
  @IsNotEmpty()
  qrCredential!: string;

  /**
   * Optional branch ID where the transaction is taking place.
   */
  @IsOptional()
  @IsUUID()
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
export class CalculateEarningsDto {
  /**
   * The resolved customer's membership ID.
   */
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  /**
   * The purchase amount in the business's currency.
   */
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  purchaseAmount!: number;

  /**
   * Optional branch ID where the purchase occurred.
   */
  @IsOptional()
  @IsUUID()
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
export class CreateLoyaltyTransactionDto {
  /**
   * The customer's membership ID.
   */
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  /**
   * The purchase amount.
   */
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  purchaseAmount!: number;

  /**
   * Stamps to award (if applicable).
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  stampsEarned?: number;

  /**
   * Points to award (if applicable).
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsEarned?: number;

  /**
   * Optional branch ID.
   */
  @IsOptional()
  @IsUUID()
  branchId?: string;

  /**
   * Idempotency key to prevent duplicate transactions.
   * Will be generated if not provided.
   */
  @IsOptional()
  @IsString()
  @Max(128)
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
export class RedeemRewardDto {
  /**
   * The customer's membership ID.
   */
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  /**
   * The reward ID to redeem.
   */
  @IsUUID()
  @IsNotEmpty()
  rewardId!: string;

  /**
   * Optional branch ID where redemption occurs.
   */
  @IsOptional()
  @IsUUID()
  branchId?: string;

  /**
   * Idempotency key to prevent duplicate redemptions.
   */
  @IsOptional()
  @IsString()
  @Max(128)
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
export class ListCustomerTransactionsDto {
  /**
   * The customer's membership ID.
   */
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  /**
   * Maximum number of transactions to return.
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  /**
   * Number of transactions to skip for pagination.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * DTO for correcting/reversing a transaction.
 */
export class CorrectTransactionDto {
  /**
   * The original transaction ID to correct.
   */
  @IsUUID()
  @IsNotEmpty()
  originalTransactionId!: string;

  /**
   * The customer's membership ID.
   */
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  /**
   * Reason for the correction.
   */
  @IsString()
  @Min(1)
  @Max(500)
  @IsNotEmpty()
  reason!: string;

  /**
   * Optional branch ID.
   */
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
