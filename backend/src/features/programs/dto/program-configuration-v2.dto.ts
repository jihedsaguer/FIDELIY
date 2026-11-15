import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { StampProgramConfigurationDto } from './stamp-program.dto';
import { PointsProgramConfigurationDto } from './points-program.dto';

export const PROGRAM_TYPES = ['stamps', 'points', 'both'] as const;
export type ProgramType = (typeof PROGRAM_TYPES)[number];
export type ConfigurationType = Exclude<ProgramType, 'both'>;

/**
 * Simplified programme configuration for backwards compatibility
 * This uses the original JSON-based approach but with better validation
 */
export class ProgramConfigurationDtoV1 {
  @IsDefined()
  @IsIn(PROGRAM_TYPES)
  type!: ProgramType;

  @IsDefined()
  @IsObject()
  configurations!: Partial<
    Record<ConfigurationType, Record<string, unknown>>
  >;
}

/**
 * Enhanced programme configuration with structured DTOs
 * This provides better type safety and validation for stamps and points programmes
 */
export class ProgramConfigurationV2Dto {
  /**
   * Programme name
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /**
   * Programme description
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  /**
   * Programme type
   */
  @IsDefined()
  @IsIn(PROGRAM_TYPES)
  type!: ProgramType;

  /**
   * Stamp programme configuration (required if type includes stamps)
   */
  @ValidateIf((o) => o.type === 'stamps' || o.type === 'both')
  @ValidateNested()
  @Type(() => StampProgramConfigurationDto)
  stamps?: StampProgramConfigurationDto;

  /**
   * Points programme configuration (required if type includes points)
   */
  @ValidateIf((o) => o.type === 'points' || o.type === 'both')
  @ValidateNested()
  @Type(() => PointsProgramConfigurationDto)
  points?: PointsProgramConfigurationDto;
}

/**
 * Response DTO for programme details
 */
export class ProgramResponseDto {
  id!: string;
  businessId!: string;
  name!: string | null;
  description!: string | null;
  type!: ProgramType;
  version!: number;
  status!: 'active' | 'inactive';
  activatedAt!: Date;
  deactivatedAt!: Date | null;
  createdAt!: Date;
  configurations!: Record<ConfigurationType, Record<string, unknown>>;
}

/**
 * Response DTO for programme list
 */
export class ProgramListResponseDto {
  programs!: ProgramResponseDto[];
  total!: number;
}
