import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import type { LoyaltyActivityType, LoyaltyTransactionCategory } from '../../loyalty/loyalty-ledger.service';

/**
 * Checkpoint 6B-C merchant transaction contract (DECISIONS.md #15).
 * Amounts are TND decimal strings with at most 3 decimals (e.g. "12.500");
 * they are converted to integer millimes once, in the service.
 */

export interface LoyaltyBalanceResponse {
  stamps: number;
  points: number;
}

export interface RewardOption {
  configurationId: string;
  rewardIndex: number;
  name: string;
  activityType: LoyaltyActivityType;
  cost: number;
  available: boolean;
}

/**
 * DTO for resolving a customer QR and preparing a loyalty transaction.
 */
export class ResolveCustomerForTransactionDto {
  @IsString()
  @IsNotEmpty()
  qrCredential!: string;

  /** Accepted for compatibility; not used by the resolution. */
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

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
    /** Whether this scan enrolled the customer (DECISIONS.md #21). */
    enrolment: 'existing' | 'joined' | 'rejoined';
  };
  balance: LoyaltyBalanceResponse;
  program: {
    id: string;
    type: 'stamps' | 'points' | 'both';
    version: number;
    name: string | null;
    configurations: {
      stamps?: { configurationId: string };
      points?: { configurationId: string; earningRate: string | null };
    };
  };
  rewards: RewardOption[];
}

/**
 * Preview only; nothing is written.
 */
export class CalculateEarningsDto {
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  /** Required for programmes that include points; optional for stamp-only programmes. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  purchaseAmount?: string;
}

export interface CalculateEarningsResponse {
  purchaseAmount: string | null;
  stampsToEarn: number;
  pointsToEarn: number;
  /** Points per TND applied, two decimals (e.g. "2.50"); null when the programme has no points. */
  earningRate: string | null;
  totalStampsAfter: number;
  totalPointsAfter: number;
}

export class CreateLoyaltyTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  /** Required for programmes that include points; optional for stamp-only programmes. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  purchaseAmount?: string;

  /** Required when the business has more than one branch. */
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;

  /**
   * Explicit merchant confirmation after a RECENT_EARNING_CONFIRMATION_REQUIRED
   * warning. Not part of the idempotency fingerprint.
   */
  @IsOptional()
  @IsBoolean()
  confirmRepeat?: boolean;
}

export interface CreateLoyaltyTransactionResponse {
  transactionId: string;
  membershipId: string;
  purchaseAmount: string | null;
  stampsEarned: number;
  pointsEarned: number;
  earningRate: string | null;
  newBalance: LoyaltyBalanceResponse;
  occurredAt: string;
  idempotencyKey: string;
}

export class RedeemRewardDto {
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  /** Programme configuration that stores the reward threshold. */
  @IsUUID()
  @IsNotEmpty()
  configurationId!: string;

  /** Index of the reward in the configuration's rewardThresholds. */
  @IsInt()
  @Min(0)
  rewardIndex!: number;

  /** Required when the business has more than one branch. */
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;
}

export interface RedeemRewardResponse {
  transactionId: string;
  membershipId: string;
  reward: Omit<RewardOption, 'available'>;
  newBalance: LoyaltyBalanceResponse;
  occurredAt: string;
  idempotencyKey: string;
}

export class ReverseTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;
}

export interface ReverseTransactionResponse {
  transactionId: string;
  reversesTransactionId: string;
  membershipId: string;
  reason: string;
  stampsDelta: number;
  pointsDelta: number;
  newBalance: LoyaltyBalanceResponse;
  occurredAt: string;
  idempotencyKey: string;
}

export class ListTransactionsQueryDto {
  @IsOptional()
  @IsUUID()
  membershipId?: string;
}

export interface TransactionHistoryEntry {
  activityType: LoyaltyActivityType;
  delta: number;
  programConfigurationId: string;
  earningRate: string | null;
}

export interface TransactionHistoryItem {
  id: string;
  membershipId: string;
  branchId: string | null;
  category: LoyaltyTransactionCategory;
  occurredAt: string;
  purchaseAmount: string | null;
  reversalReason: string | null;
  reversesTransactionId: string | null;
  reversedByTransactionId: string | null;
  stampsDelta: number;
  pointsDelta: number;
  entries: TransactionHistoryEntry[];
}

/** Totals for one currency (stamps or points) over the whole membership ledger. */
export interface CurrencyTotals {
  earned: number;
  /** Positive amount taken back by reversing purchases. */
  earningsReversed: number;
  /** Positive amount spent on rewards. */
  redeemed: number;
  /** Positive amount returned by reversing redemptions. */
  redemptionsReversed: number;
  /** Net manual adjustments (expected 0 in Release 1). */
  adjustments: number;
  /** earned - earningsReversed - redeemed + redemptionsReversed + adjustments. */
  balance: number;
}

/** Present only when the request filters by membershipId. */
export interface TransactionHistorySummary {
  stamps: CurrencyTotals;
  points: CurrencyTotals;
  transactionCount: number;
  programType: 'stamps' | 'points' | 'both' | null;
  rewards: Array<Omit<RewardOption, 'available'>>;
}

export interface TransactionHistoryResponse {
  transactions: TransactionHistoryItem[];
  summary?: TransactionHistorySummary;
}
