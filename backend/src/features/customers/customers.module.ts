import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { SharedModule } from '../../shared/shared.module';
import { CustomerMembershipService } from './customer-membership.service';

@Module({
  imports: [SharedModule],
  controllers: [CustomersController],
  providers: [CustomerMembershipService],
})
export class CustomersModule {}
