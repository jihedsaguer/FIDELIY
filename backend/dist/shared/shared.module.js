"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const tenant_context_service_1 = require("./database/tenant-context.service");
const customer_guard_1 = require("./guards/customer.guard");
const merchant_guard_1 = require("./guards/merchant.guard");
const storage_provider_1 = require("./storage/storage.provider");
const local_storage_adapter_1 = require("./storage/local-storage.adapter");
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
let SharedModule = class SharedModule {
};
exports.SharedModule = SharedModule;
exports.SharedModule = SharedModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        providers: [
            tenant_context_service_1.TenantContextService,
            customer_guard_1.CustomerGuard,
            merchant_guard_1.MerchantGuard,
            {
                provide: storage_provider_1.StorageProvider,
                useFactory: () => new local_storage_adapter_1.LocalStorageAdapter('/data/logos'),
            },
        ],
        exports: [
            tenant_context_service_1.TenantContextService,
            database_module_1.DatabaseModule,
            customer_guard_1.CustomerGuard,
            merchant_guard_1.MerchantGuard,
            storage_provider_1.StorageProvider,
        ],
    })
], SharedModule);
//# sourceMappingURL=shared.module.js.map