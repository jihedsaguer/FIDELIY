"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const database_module_1 = require("./database/database.module");
const shared_module_1 = require("./shared/shared.module");
const auth_module_1 = require("./features/auth/auth.module");
const customers_module_1 = require("./features/customers/customers.module");
const merchants_module_1 = require("./features/merchants/merchants.module");
const programs_module_1 = require("./features/programs/programs.module");
const loyalty_module_1 = require("./features/loyalty/loyalty.module");
const admin_module_1 = require("./features/admin/admin.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const session_validation_middleware_1 = require("./shared/middleware/session-validation.middleware");
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
let AppModule = class AppModule {
    configure(consumer) {
        // Register session validation middleware globally
        // This middleware runs on all routes except those explicitly excluded
        consumer.apply(session_validation_middleware_1.SessionValidationMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            database_module_1.DatabaseModule,
            shared_module_1.SharedModule,
            auth_module_1.AuthModule,
            customers_module_1.CustomersModule,
            merchants_module_1.MerchantsModule,
            programs_module_1.ProgramsModule,
            loyalty_module_1.LoyaltyModule,
            admin_module_1.AdminModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map