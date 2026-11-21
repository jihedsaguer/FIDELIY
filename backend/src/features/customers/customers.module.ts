import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { PublicCustomerController } from './public-customer.controller';
import { SharedModule } from '../../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { CustomerMembershipService } from './customer-membership.service';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [CustomersController, PublicCustomerController],
  providers: [CustomerMembershipService],
})
export class CustomersModule {}
