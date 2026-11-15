import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TenantContextService } from './database/tenant-context.service';
import { CustomerGuard } from './guards/customer.guard';
import { MerchantGuard } from './guards/merchant.guard';
import { StorageProvider } from './storage/storage.provider';
import { LocalStorageAdapter } from './storage/local-storage.adapter';

/**
 * Phase 1B: Shared Module
 *
 * Exports:
 * - TenantContextService: RLS context management for multi-tenant queries
 * - CustomerGuard: Guard for customer-only endpoints
 * - MerchantGuard: Guard for merchant-only endpoints
 * - DatabaseModule: Pool and Drizzle instance
 * - StorageProvider: Abstract storage interface
 *
 * Imported by all domain modules for consistent database access, auth enforcement, and file storage.
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    TenantContextService,
    CustomerGuard,
    MerchantGuard,
    {
      provide: StorageProvider,
      useFactory: () => new LocalStorageAdapter('/data/logos'),
    },
  ],
  exports: [
    TenantContextService,
    DatabaseModule,
    CustomerGuard,
    MerchantGuard,
    StorageProvider,
  ],
})
export class SharedModule {}
