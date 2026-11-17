import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { BusinessAccessModule } from '../merchants/business-access.module';
import { LoyaltyLedgerService } from './loyalty-ledger.service';
import { CustomerBalanceService } from './customer-balance.service';

/**
 * Phase 1B: Loyalty Module
 *
 * Responsible for:
 * - Transaction processing (earning, redemption)
 * - Balance management
 * - Loyalty submodules: earning, redemption, balances
 */
@Module({
  imports: [SharedModule, BusinessAccessModule],
  providers: [LoyaltyLedgerService, CustomerBalanceService],
  exports: [LoyaltyLedgerService, CustomerBalanceService],
})
export class LoyaltyModule {}
