import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { BusinessAccessModule } from '../merchants/business-access.module';
import { LoyaltyLedgerService } from './loyalty-ledger.service';

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
  imports: [SharedModule, BusinessAccessModule],
  providers: [LoyaltyLedgerService],
  exports: [LoyaltyLedgerService],
})
export class LoyaltyModule {}
