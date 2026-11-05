import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller';
import { SharedModule } from '../../shared/shared.module';

/**
 * Phase 1B: Merchants Module (Skeleton)
 *
 * Responsible for:
 * - Merchant account management
 * - Business management
 * - Branch management
 * - Program configuration
 *
 * Phase 1B: Only test endpoints for auth verification.
 * Phase 2+: Implement full merchant functionality.
 */
@Module({
  imports: [SharedModule],
  controllers: [MerchantsController],
})
export class MerchantsModule {}
