import { IsDefined, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const PROGRAM_TYPES = ['stamps', 'points', 'both'] as const;
export type ProgramType = (typeof PROGRAM_TYPES)[number];
export type ConfigurationType = Exclude<ProgramType, 'both'>;

export class ProgramConfigurationDto {
  @IsDefined()
  @IsIn(PROGRAM_TYPES)
  type!: ProgramType;

  @IsDefined()
  @IsObject()
  configurations!: Partial<
    Record<ConfigurationType, Record<string, unknown>>
  >;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}
