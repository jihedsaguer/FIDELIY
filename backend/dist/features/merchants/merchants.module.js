"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantsModule = void 0;
const common_1 = require("@nestjs/common");
const merchants_controller_1 = require("./merchants.controller");
const business_access_module_1 = require("./business-access.module");
const business_setup_service_1 = require("./business-setup.service");
const branch_service_1 = require("./branch.service");
const logo_upload_service_1 = require("./services/logo-upload.service");
const shared_module_1 = require("../../shared/shared.module");
const merchant_customer_service_1 = require("./merchant-customer.service");
const merchant_transaction_service_1 = require("./merchant-transaction.service");
const merchant_customer_registration_service_1 = require("./merchant-customer-registration.service");
const loyalty_module_1 = require("../loyalty/loyalty.module");
/**
 * Merchant account, business setup, branch management, logo upload, and loyalty transactions.
 */
let MerchantsModule = class MerchantsModule {
};
exports.MerchantsModule = MerchantsModule;
exports.MerchantsModule = MerchantsModule = __decorate([
    (0, common_1.Module)({
        imports: [shared_module_1.SharedModule, business_access_module_1.BusinessAccessModule, loyalty_module_1.LoyaltyModule],
        controllers: [merchants_controller_1.MerchantsController],
        providers: [
            business_setup_service_1.BusinessSetupService,
            branch_service_1.BranchService,
            logo_upload_service_1.LogoUploadService,
            merchant_customer_service_1.MerchantCustomerService,
            merchant_transaction_service_1.MerchantTransactionService,
            merchant_customer_registration_service_1.MerchantCustomerRegistrationService,
        ],
    })
], MerchantsModule);
//# sourceMappingURL=merchants.module.js.map