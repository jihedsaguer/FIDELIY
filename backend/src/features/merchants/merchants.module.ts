import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller';
import { BusinessAccessModule } from './business-access.module';
import { BusinessSetupService } from './business-setup.service';
import { BranchService } from './branch.service';
import { LogoUploadService } from './services/logo-upload.service';
import { SharedModule } from '../../shared/shared.module';
import { MerchantCustomerService } from './merchant-customer.service';

/**
 * Merchant account, business setup, branch management, and logo upload feature.
 */
@Module({
  imports: [SharedModule, BusinessAccessModule],
  controllers: [MerchantsController],
  providers: [
    BusinessSetupService,
    BranchService,
    LogoUploadService,
    MerchantCustomerService,
  ],
})
export class MerchantsModule {}
