export declare const PROGRAM_TYPES: readonly ["stamps", "points", "both"];
export type ProgramType = (typeof PROGRAM_TYPES)[number];
export type ConfigurationType = Exclude<ProgramType, 'both'>;
export declare class ProgramConfigurationDto {
    type: ProgramType;
    configurations: Partial<Record<ConfigurationType, Record<string, unknown>>>;
    name?: string | null;
    description?: string | null;
}
//# sourceMappingURL=program-configuration.dto.d.ts.map