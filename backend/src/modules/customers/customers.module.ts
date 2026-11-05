import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { SharedModule } from '../../shared/shared.module';

/**
 * Phase 1B: Customers Module (Skeleton)
 *
 * Responsible for:
 * - Customer account management
 * - Customer profiles
 * - Customer-specific business logic
 *
 * Phase 1B: Only test endpoints for auth verification.
 * Phase 2+: Implement full customer account management.
 */
@Module({
  imports: [SharedModule],
  controllers: [CustomersController],
})
export class CustomersModule {}
