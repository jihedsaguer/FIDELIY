import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for points-based programme earning rule
 */
export class PointsEarningRuleDto {
  /**
   * Number of points earned per unit of currency spent
   * e.g., 1 TND = 5 points
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  pointsPerCurrencyUnit!: number;

  /**
   * Currency code (default: TND for Tunisia)
   */
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  /**
   * Optional description of the earning rule
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/**
 * DTO for points-based programme reward threshold
 */
export class PointsRewardThresholdDto {
  /**
   * Number of points required for this reward
   */
  @IsInt()
  @Min(1)
  pointsRequired!: number;

  /**
   * Reward name
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /**
   * Reward description
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  /**
   * Whether this reward is currently active
   */
  @IsOptional()
  isActive!: boolean;
}

/**
 * DTO for points programme configuration
 */
export class PointsProgramConfigurationDto {
  /**
   * Earning rule for points
   */
  @ValidateNested()
  @Type(() => PointsEarningRuleDto)
  earningRule!: PointsEarningRuleDto;

  /**
   * List of reward thresholds
   */
  @ValidateNested({ each: true })
  @Type(() => PointsRewardThresholdDto)
  rewardThresholds!: PointsRewardThresholdDto[];

  /**
   * Optional: Expiration period for points in days (null = no expiration)
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  pointsExpirationDays?: number | null;
}
