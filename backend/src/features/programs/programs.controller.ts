import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../shared/decorators/current-user.decorator';
import { MerchantGuard } from '../../shared/guards/merchant.guard';
import { ProgramConfigurationDto } from './dto/program-configuration.dto';
import {
  ProgramConfigurationV2Dto,
  ProgramListResponseDto,
  ProgramResponseDto,
} from './dto/program-configuration-v2.dto';
import { ProgramsService } from './programs.service';

@Controller('programs')
@UseGuards(MerchantGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  /**
   * Get the current active programme for the merchant's business.
   */
  @Get('current')
  getCurrent(@CurrentUser() user: CurrentUserPayload): Promise<ProgramResponseDto | null> {
    return this.programsService.getCurrent(user.id);
  }

  /**
   * Get all programmes (current and historical) for the merchant's business.
   */
  @Get('history')
  getHistory(@CurrentUser() user: CurrentUserPayload): Promise<ProgramResponseDto[]> {
    return this.programsService.getHistory(user.id);
  }

  /**
   * Get a specific programme by ID.
   */
  @Get(':programId')
  getProgram(
    @CurrentUser() user: CurrentUserPayload,
    @Param('programId') programId: string,
  ): Promise<ProgramResponseDto> {
    return this.programsService.getProgram(user.id, programId);
  }

  /**
   * List all programmes for the merchant's business.
   */
  @Get()
  listPrograms(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ProgramListResponseDto> {
    return this.programsService.listPrograms(user.id);
  }

  /**
   * Create the initial programme for the merchant's business.
   * Only succeeds if no active programme exists.
   * Uses the original JSON-based configuration format.
   */
  @Post()
  createInitial(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: ProgramConfigurationDto,
  ): Promise<ProgramResponseDto> {
    return this.programsService.createInitial(user.id, input);
  }

  /**
   * Create a new programme version.
   * Deactivates the current active programme and creates a new one.
   * Uses the original JSON-based configuration format.
   */
  @Post('versions')
  createVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: ProgramConfigurationDto,
  ): Promise<ProgramResponseDto> {
    return this.programsService.createVersion(user.id, input);
  }

  /**
   * Create a new programme with enhanced configuration.
   * Uses structured DTOs for stamps and points programmes.
   */
  @Post('enhanced')
  createEnhanced(
    @CurrentUser() user: CurrentUserPayload,
    @Body() input: ProgramConfigurationV2Dto,
  ) {
    return this.programsService.createEnhanced(user.id, input);
  }

  /**
   * Update a programme's metadata (name, description).
   * Does not modify the programme configuration.
   */
  @Patch(':programId')
  updateProgram(
    @CurrentUser() user: CurrentUserPayload,
    @Param('programId') programId: string,
    @Body() input: { name?: string; description?: string },
  ): Promise<ProgramResponseDto> {
    return this.programsService.updateProgram(user.id, programId, input);
  }

  /**
   * Deactivate a programme.
   * Only the current active programme can be deactivated.
   */
  @Patch(':programId/deactivate')
  deactivateProgram(
    @CurrentUser() user: CurrentUserPayload,
    @Param('programId') programId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.programsService.deactivateProgram(user.id, programId);
  }

  /**
   * Delete a programme.
   * Only inactive programmes can be deleted.
   */
  @Delete(':programId')
  deleteProgram(
    @CurrentUser() user: CurrentUserPayload,
    @Param('programId') programId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.programsService.deleteProgram(user.id, programId);
  }
}
