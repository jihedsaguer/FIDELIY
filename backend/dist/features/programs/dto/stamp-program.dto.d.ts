/**
 * DTO for stamp-based programme earning rule
 */
export declare class StampEarningRuleDto {
    /**
     * Number of purchases/visits required to earn one stamp
     */
    purchasesPerStamp: number;
    /**
     * Optional description of the earning rule
     */
    description?: string;
}
/**
 * DTO for stamp-based programme reward threshold
 */
export declare class StampRewardThresholdDto {
    /**
     * Number of stamps required for this reward
     */
    stampsRequired: number;
    /**
     * Reward name
     */
    name: string;
    /**
     * Reward description
     */
    description?: string;
    /**
     * Whether this reward is currently active
     */
    isActive: boolean;
}
/**
 * DTO for stamp programme configuration
 */
export declare class StampProgramConfigurationDto {
    /**
     * Earning rule for stamps
     */
    earningRule: StampEarningRuleDto;
    /**
     * List of reward thresholds
     */
    rewardThresholds: StampRewardThresholdDto[];
    /**
     * Optional: Expiration period for stamps in days (null = no expiration)
     */
    stampExpirationDays?: number | null;
}
//# sourceMappingURL=stamp-program.dto.d.ts.map