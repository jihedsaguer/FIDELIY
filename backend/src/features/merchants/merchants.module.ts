import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller';
import { BusinessAccessModule } from './business-access.module';
import { BusinessSetupService } from './business-setup.service';
import { BranchService } from './branch.service';
import { LogoUploadService } from './services/logo-upload.service';
import { SharedModule } from '../../shared/shared.module';
import { MerchantCustomerService } from './merchant-customer.service';
import { MerchantTransactionService } from './merchant-transaction.service';
import { MerchantCustomerRegistrationService } from './merchant-customer-registration.service';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Merchant account, business setup, branch management, logo upload, and loyalty transactions.
 */
@Module({
  imports: [SharedModule, BusinessAccessModule, LoyaltyModule, AuthModule],
  controllers: [MerchantsController],
  providers: [
    BusinessSetupService,
    BranchService,
    LogoUploadService,
    MerchantCustomerService,
    MerchantTransactionService,
    MerchantCustomerRegistrationService,
  ],
})
export class MerchantsModule {}
