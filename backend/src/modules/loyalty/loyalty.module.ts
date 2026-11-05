import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';

/**
 * Phase 1B: Loyalty Module (Skeleton)
 *
 * Responsible for:
 * - Transaction processing (earning, redemption)
 * - Balance management
 * - Loyalty submodules: earning, redemption, balances
 *
 * Phase 1B: Not implemented yet.
 * Phase 2+: Full implementation.
 */
@Module({
  imports: [SharedModule],
})
export class LoyaltyModule {}
