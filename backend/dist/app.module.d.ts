import { MiddlewareConsumer, NestModule } from '@nestjs/common';
/**
 * Phase 1B: Root Application Module
 *
 * 8-Module Architecture:
 * 1. Auth — Better Auth integration, session management
 * 2. Customers — Customer accounts, profiles
 * 3. Merchants — Merchant accounts, businesses, branches
 * 4. Programs — Loyalty program configuration
 * 5. Loyalty — Transaction processing, redemption, balances
 * 6. Admin — Platform administration
 * 7. Shared — Utilities, guards, database layer, RLS context
 * 8. Database — Drizzle ORM schema, migrations
 *
 * Key Design Principles:
 * - Single Better Auth instance with phone + email/password plugins
 * - Account type separation via NestJS guards (CustomerGuard, MerchantGuard)
 * - Multi-tenancy via PostgreSQL RLS (transaction-scoped app.user_id context)
 * - Repository pattern enforces transaction usage (tx only, no db injection)
 * - Transaction-local RLS context auto-clears on COMMIT/ROLLBACK
 * - Session validation middleware validates all incoming requests
 */
export declare class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void;
}
//# sourceMappingURL=app.module.d.ts.map