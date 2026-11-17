"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyModule = void 0;
const common_1 = require("@nestjs/common");
const shared_module_1 = require("../../shared/shared.module");
const business_access_module_1 = require("../merchants/business-access.module");
const loyalty_ledger_service_1 = require("./loyalty-ledger.service");
const customer_balance_service_1 = require("./customer-balance.service");
/**
 * Phase 1B: Loyalty Module
 *
 * Responsible for:
 * - Transaction processing (earning, redemption)
 * - Balance management
 * - Loyalty submodules: earning, redemption, balances
 */
let LoyaltyModule = class LoyaltyModule {
};
exports.LoyaltyModule = LoyaltyModule;
exports.LoyaltyModule = LoyaltyModule = __decorate([
    (0, common_1.Module)({
        imports: [shared_module_1.SharedModule, business_access_module_1.BusinessAccessModule],
        providers: [loyalty_ledger_service_1.LoyaltyLedgerService, customer_balance_service_1.CustomerBalanceService],
        exports: [loyalty_ledger_service_1.LoyaltyLedgerService, customer_balance_service_1.CustomerBalanceService],
    })
], LoyaltyModule);
//# sourceMappingURL=loyalty.module.js.map