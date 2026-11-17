import { TenantContextService } from '../../shared/database/tenant-context.service';
import { BusinessAccessService } from './business-access.service';
import { LoyaltyLedgerService } from '../loyalty/loyalty-ledger.service';
import { CustomerBalanceService } from '../loyalty/customer-balance.service';
import { CustomerForTransactionResponse, CalculateEarningsDto, CalculateEarningsResponse, CreateLoyaltyTransactionDto, CreateLoyaltyTransactionResponse, RedeemRewardDto, RedeemRewardResponse } from './dto/merchant-transaction.dto';
export declare class MerchantTransactionService {
    private readonly tenantContext;
    private readonly businessAccess;
    private readonly loyaltyLedger;
    private readonly customerBalance;
    constructor(tenantContext: TenantContextService, businessAccess: BusinessAccessService, loyaltyLedger: LoyaltyLedgerService, customerBalance: CustomerBalanceService);
    /**
     * Resolve a customer QR credential and get their information for a transaction.
     *
     * @param authenticatedUserId - The authenticated merchant's user ID
     * @param qrCredential - The customer's personal QR credential
     * @param branchId - Optional branch ID
     * @returns Customer information, membership, balance, programme, and eligible rewards
     */
    resolveCustomerForTransaction(authenticatedUserId: string, qrCredential: string, branchId?: string): Promise<CustomerForTransactionResponse>;
    /**
     * Calculate loyalty earnings for a purchase amount.
     *
     * @param authenticatedUserId - The authenticated merchant's user ID
     * @param dto - DTO containing membership ID and purchase amount
     * @returns Calculated earnings and resulting balances
     */
    calculateEarnings(authenticatedUserId: string, dto: CalculateEarningsDto): Promise<CalculateEarningsResponse>;
    /**
     * Create a loyalty transaction for a customer.
     *
     * @param authenticatedUserId - The authenticated merchant's user ID
     * @param dto - DTO containing transaction details
     * @returns Created transaction information
     */
    createLoyaltyTransaction(authenticatedUserId: string, dto: CreateLoyaltyTransactionDto): Promise<CreateLoyaltyTransactionResponse>;
    /**
     * Redeem a reward for a customer.
     *
     * @param authenticatedUserId - The authenticated merchant's user ID
     * @param dto - DTO containing redemption details
     * @returns Redemption information
     */
    redeemReward(authenticatedUserId: string, dto: RedeemRewardDto): Promise<RedeemRewardResponse>;
    private getEligibleRewards;
}
//# sourceMappingURL=merchant-transaction.service.d.ts.map