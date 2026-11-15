import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { BusinessAccessModule } from '../merchants/business-access.module';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';

@Module({
  imports: [SharedModule, BusinessAccessModule],
  controllers: [ProgramsController],
  providers: [ProgramsService],
})
export class ProgramsModule {}
