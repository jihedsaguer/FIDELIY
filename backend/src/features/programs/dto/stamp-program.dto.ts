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
   * Deprecated (DECISIONS.md #15 rule 2): earning is one stamp per confirmed
   * purchase and this value is not used to calculate stamps. Still accepted
   * and stored when supplied; historical configurations are not rewritten.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  purchasesPerStamp?: number;

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
