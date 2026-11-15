import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for stamp-based programme earning rule
 */
export class StampEarningRuleDto {
  /**
   * Number of purchases/visits required to earn one stamp
   */
  @IsInt()
  @Min(1)
  purchasesPerStamp!: number;

  /**
   * Optional description of the earning rule
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/**
 * DTO for stamp-based programme reward threshold
 */
export class StampRewardThresholdDto {
  /**
   * Number of stamps required for this reward
   */
  @IsInt()
  @Min(1)
  stampsRequired!: number;

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
 * DTO for stamp programme configuration
 */
export class StampProgramConfigurationDto {
  /**
   * Earning rule for stamps
   */
  @ValidateNested()
  @Type(() => StampEarningRuleDto)
  earningRule!: StampEarningRuleDto;

  /**
   * List of reward thresholds
   */
  @ValidateNested({ each: true })
  @Type(() => StampRewardThresholdDto)
  rewardThresholds!: StampRewardThresholdDto[];

  /**
   * Optional: Expiration period for stamps in days (null = no expiration)
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  stampExpirationDays?: number | null;
}
