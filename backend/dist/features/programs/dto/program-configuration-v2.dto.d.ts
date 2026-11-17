import { StampProgramConfigurationDto } from './stamp-program.dto';
import { PointsProgramConfigurationDto } from './points-program.dto';
export declare const PROGRAM_TYPES: readonly ["stamps", "points", "both"];
export type ProgramType = (typeof PROGRAM_TYPES)[number];
export type ConfigurationType = Exclude<ProgramType, 'both'>;
/**
 * Simplified programme configuration for backwards compatibility
 * This uses the original JSON-based approach but with better validation
 */
export declare class ProgramConfigurationDtoV1 {
    type: ProgramType;
    configurations: Partial<Record<ConfigurationType, Record<string, unknown>>>;
}
/**
 * Enhanced programme configuration with structured DTOs
 * This provides better type safety and validation for stamps and points programmes
 */
export declare class ProgramConfigurationV2Dto {
    /**
     * Programme name
     */
    name?: string;
    /**
     * Programme description
     */
    description?: string;
    /**
     * Programme type
     */
    type: ProgramType;
    /**
     * Stamp programme configuration (required if type includes stamps)
     */
    stamps?: StampProgramConfigurationDto;
    /**
     * Points programme configuration (required if type includes points)
     */
    points?: PointsProgramConfigurationDto;
}
/**
 * Response DTO for programme details
 */
export declare class ProgramResponseDto {
    id: string;
    businessId: string;
    name: string | null;
    description: string | null;
    type: ProgramType;
    version: number;
    status: 'active' | 'inactive';
    activatedAt: Date;
    deactivatedAt: Date | null;
    createdAt: Date;
    configurations: Record<ConfigurationType, Record<string, unknown>>;
}
/**
 * Response DTO for programme list
 */
export declare class ProgramListResponseDto {
    programs: ProgramResponseDto[];
    total: number;
}
//# sourceMappingURL=program-configuration-v2.dto.d.ts.map