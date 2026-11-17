/**
 * DTO for points-based programme earning rule
 */
export declare class PointsEarningRuleDto {
    /**
     * Number of points earned per unit of currency spent
     * e.g., 1 TND = 5 points
     */
    pointsPerCurrencyUnit: number;
    /**
     * Currency code (default: TND for Tunisia)
     */
    currencyCode?: string;
    /**
     * Optional description of the earning rule
     */
    description?: string;
}
/**
 * DTO for points-based programme reward threshold
 */
export declare class PointsRewardThresholdDto {
    /**
     * Number of points required for this reward
     */
    pointsRequired: number;
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
 * DTO for points programme configuration
 */
export declare class PointsProgramConfigurationDto {
    /**
     * Earning rule for points
     */
    earningRule: PointsEarningRuleDto;
    /**
     * List of reward thresholds
     */
    rewardThresholds: PointsRewardThresholdDto[];
    /**
     * Optional: Expiration period for points in days (null = no expiration)
     */
    pointsExpirationDays?: number | null;
}
//# sourceMappingURL=points-program.dto.d.ts.map