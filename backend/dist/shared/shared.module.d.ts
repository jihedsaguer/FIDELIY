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
export declare class SharedModule {
}
//# sourceMappingURL=shared.module.d.ts.map