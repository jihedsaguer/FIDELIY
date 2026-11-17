import { TenantContextService } from '../../shared/database/tenant-context.service';
import { ConfigurationType, ProgramConfigurationDto, ProgramType } from './dto/program-configuration.dto';
import { ProgramConfigurationV2Dto, ProgramListResponseDto, ProgramResponseDto } from './dto/program-configuration-v2.dto';
type ProgramStatus = 'active' | 'inactive';
export interface ProgramConfigurationRecord {
    type: ConfigurationType;
    settings: Record<string, unknown>;
}
export interface ProgramRecord {
    id: string;
    businessId: string;
    name: string | null;
    description: string | null;
    type: ProgramType;
    version: number;
    status: ProgramStatus;
    activatedAt: Date;
    deactivatedAt: Date | null;
    createdAt: Date;
    configurations: ProgramConfigurationRecord[];
}
export declare class ProgramsService {
    private readonly tenantContext;
    constructor(tenantContext: TenantContextService);
    getCurrent(userId: string): Promise<ProgramResponseDto | null>;
    getHistory(userId: string): Promise<ProgramResponseDto[]>;
    createInitial(userId: string, input: ProgramConfigurationDto): Promise<ProgramResponseDto>;
    createVersion(userId: string, input: ProgramConfigurationDto): Promise<ProgramResponseDto>;
    private validateConfigurations;
    private getOwnedBusinessId;
    private lockOwnedBusiness;
    private nextVersion;
    private insertProgram;
    private loadPrograms;
    private enabledTypes;
    getProgram(userId: string, programId: string): Promise<ProgramResponseDto>;
    listPrograms(userId: string): Promise<ProgramListResponseDto>;
    createEnhanced(userId: string, input: ProgramConfigurationV2Dto): Promise<ProgramResponseDto>;
    updateProgram(userId: string, programId: string, input: {
        name?: string;
        description?: string;
    }): Promise<ProgramResponseDto>;
    deactivateProgram(userId: string, programId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteProgram(userId: string, programId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private mapToResponseDto;
}
export {};
//# sourceMappingURL=programs.service.d.ts.map