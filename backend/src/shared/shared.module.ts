import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TenantContextService } from './database/tenant-context.service';
import { CustomerGuard } from './guards/customer.guard';
import { MerchantGuard } from './guards/merchant.guard';

/**
 * Phase 1B: Shared Module
 *
 * Exports:
 * - TenantContextService: RLS context management for multi-tenant queries
 * - CustomerGuard: Guard for customer-only endpoints
 * - MerchantGuard: Guard for merchant-only endpoints
 * - DatabaseModule: Pool and Drizzle instance
 *
 * Imported by all domain modules for consistent database access and auth enforcement.
 */
@Module({
  imports: [DatabaseModule],
  providers: [TenantContextService, CustomerGuard, MerchantGuard],
  exports: [TenantContextService, DatabaseModule, CustomerGuard, MerchantGuard],
})
export class SharedModule {}
