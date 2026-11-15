import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './features/auth/auth.module';
import { CustomersModule } from './features/customers/customers.module';
import { MerchantsModule } from './features/merchants/merchants.module';
import { ProgramsModule } from './features/programs/programs.module';
import { LoyaltyModule } from './features/loyalty/loyalty.module';
import { AdminModule } from './features/admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionValidationMiddleware } from './shared/middleware/session-validation.middleware';

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
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    SharedModule,
    AuthModule,
    CustomersModule,
    MerchantsModule,
    ProgramsModule,
    LoyaltyModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Register session validation middleware globally
    // This middleware runs on all routes except those explicitly excluded
    consumer.apply(SessionValidationMiddleware).forRoutes('*');
  }
}
