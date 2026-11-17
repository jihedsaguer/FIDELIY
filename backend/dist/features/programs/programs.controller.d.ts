import { CurrentUserPayload } from '../../shared/decorators/current-user.decorator';
import { ProgramConfigurationDto } from './dto/program-configuration.dto';
import { ProgramConfigurationV2Dto, ProgramListResponseDto, ProgramResponseDto } from './dto/program-configuration-v2.dto';
import { ProgramsService } from './programs.service';
export declare class ProgramsController {
    private readonly programsService;
    constructor(programsService: ProgramsService);
    /**
     * Get the current active programme for the merchant's business.
     */
    getCurrent(user: CurrentUserPayload): Promise<ProgramResponseDto | null>;
    /**
     * Get all programmes (current and historical) for the merchant's business.
     */
    getHistory(user: CurrentUserPayload): Promise<ProgramResponseDto[]>;
    /**
     * Get a specific programme by ID.
     */
    getProgram(user: CurrentUserPayload, programId: string): Promise<ProgramResponseDto>;
    /**
     * List all programmes for the merchant's business.
     */
    listPrograms(user: CurrentUserPayload): Promise<ProgramListResponseDto>;
    /**
     * Create the initial programme for the merchant's business.
     * Only succeeds if no active programme exists.
     * Uses the original JSON-based configuration format.
     */
    createInitial(user: CurrentUserPayload, input: ProgramConfigurationDto): Promise<ProgramResponseDto>;
    /**
     * Create a new programme version.
     * Deactivates the current active programme and creates a new one.
     * Uses the original JSON-based configuration format.
     */
    createVersion(user: CurrentUserPayload, input: ProgramConfigurationDto): Promise<ProgramResponseDto>;
    /**
     * Create a new programme with enhanced configuration.
     * Uses structured DTOs for stamps and points programmes.
     */
    createEnhanced(user: CurrentUserPayload, input: ProgramConfigurationV2Dto): Promise<ProgramResponseDto>;
    /**
     * Update a programme's metadata (name, description).
     * Does not modify the programme configuration.
     */
    updateProgram(user: CurrentUserPayload, programId: string, input: {
        name?: string;
        description?: string;
    }): Promise<ProgramResponseDto>;
    /**
     * Deactivate a programme.
     * Only the current active programme can be deactivated.
     */
    deactivateProgram(user: CurrentUserPayload, programId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Delete a programme.
     * Only inactive programmes can be deleted.
     */
    deleteProgram(user: CurrentUserPayload, programId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=programs.controller.d.ts.map