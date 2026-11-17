import type { Response } from 'express';
import { CurrentUserPayload } from '../../shared/decorators/current-user.decorator';
import { CreateBusinessDto, CreateFirstBranchDto, UpdateBusinessSetupDto, UpdateFirstBranchDto } from './dto/business-setup.dto';
import { CreateBranchDto, UpdateBranchDto, BranchResponseDto, BranchListResponseDto } from './dto/branch.dto';
import { LogoUploadResponseDto } from './dto/logo-upload.dto';
import { BusinessSetupService } from './business-setup.service';
import { BranchService } from './branch.service';
import { MerchantCustomerService } from './merchant-customer.service';
import { MerchantTransactionService } from './merchant-transaction.service';
import { ResolveCustomerQrDto } from './dto/resolve-customer-qr.dto';
import { ResolveCustomerForTransactionDto, CalculateEarningsDto, CreateLoyaltyTransactionDto, RedeemRewardDto, CustomerForTransactionResponse, CalculateEarningsResponse, CreateLoyaltyTransactionResponse, RedeemRewardResponse } from './dto/merchant-transaction.dto';
/**
 * Merchant profile and owner-scoped business setup endpoints.
 */
export declare class MerchantsController {
    private readonly businessSetupService;
    private readonly branchService;
    private readonly merchantCustomers;
    private readonly merchantTransactions;
    constructor(businessSetupService: BusinessSetupService, branchService: BranchService, merchantCustomers: MerchantCustomerService, merchantTransactions: MerchantTransactionService);
    /**
     * Test endpoint: Get merchant profile.
     * Requires MerchantGuard (authenticated user with merchant account).
     *
     * Success: 200 OK with user and merchant account info
     * No session: 401 Unauthorized
     * No merchant account: 403 Forbidden
     */
    getMerchantProfile(user: CurrentUserPayload): Promise<{
        message: string;
        userId: string;
        merchantAccount: any;
        timestamp: string;
    }>;
    /**
     * Test endpoint: Get merchant dashboard.
     * Requires MerchantGuard.
     */
    getMerchantDashboard(user: CurrentUserPayload): Promise<{
        message: string;
        userId: string;
        timestamp: string;
        note: string;
    }>;
    getBusinessSetup(user: CurrentUserPayload): Promise<import("./business-setup.service").BusinessSetupResponse>;
    createBusiness(user: CurrentUserPayload, input: CreateBusinessDto): Promise<import("./business-setup.service").BusinessSetupResponse>;
    updateBusiness(user: CurrentUserPayload, input: UpdateBusinessSetupDto): Promise<import("./business-setup.service").BusinessSetupResponse>;
    createFirstBranch(user: CurrentUserPayload, input: CreateFirstBranchDto): Promise<import("./business-setup.service").BusinessSetupResponse>;
    updateFirstBranch(user: CurrentUserPayload, input: UpdateFirstBranchDto): Promise<import("./business-setup.service").BusinessSetupResponse>;
    completeBusinessSetup(user: CurrentUserPayload): Promise<import("./business-setup.service").BusinessSetupResponse>;
    resolveCustomerQr(user: CurrentUserPayload, input: ResolveCustomerQrDto): Promise<{
        customer: {
            name: string;
        };
        membership: {
            status: "active";
            joinedAt: Date;
        };
    }>;
    /**
     * Resolve a customer QR for a loyalty transaction.
     * Returns customer info, balance, programme details, and eligible rewards.
     */
    resolveCustomerForTransaction(user: CurrentUserPayload, input: ResolveCustomerForTransactionDto): Promise<CustomerForTransactionResponse>;
    /**
     * Calculate loyalty earnings for a purchase amount.
     * Returns the stamps and points that would be earned.
     */
    calculateEarnings(user: CurrentUserPayload, input: CalculateEarningsDto): Promise<CalculateEarningsResponse>;
    /**
     * Create a loyalty transaction for a customer.
     * Records stamps and/or points earned from a purchase.
     */
    createLoyaltyTransaction(user: CurrentUserPayload, input: CreateLoyaltyTransactionDto): Promise<CreateLoyaltyTransactionResponse>;
    /**
     * Redeem a reward for a customer.
     * Deducts the reward cost from the customer's balance.
     */
    redeemReward(user: CurrentUserPayload, input: RedeemRewardDto): Promise<RedeemRewardResponse>;
    /**
     * Upload a device-based logo for the authenticated merchant's business.
     * Requires MerchantGuard and a valid image file.
     *
     * Request: multipart/form-data with file field
     * Success: 200 OK with logo metadata (storage key, dimensions, MIME type)
     * Validation: 400 Bad Request if file is invalid (size, format, content)
     * No business: 404 Not Found
     */
    uploadLogo(user: CurrentUserPayload, file: any): Promise<LogoUploadResponseDto>;
    /**
     * Retrieve the authenticated merchant's business logo.
     * Requires MerchantGuard.
     *
     * Success: 200 OK with image file and appropriate Content-Type header
     * No logo: 404 Not Found
     */
    getLogo(user: CurrentUserPayload, res: Response): Promise<void>;
    /**
     * List all branches for the authenticated merchant's business.
     */
    listBranches(user: CurrentUserPayload): Promise<BranchListResponseDto>;
    /**
     * Get a specific branch by ID.
     */
    getBranch(user: CurrentUserPayload, branchId: string): Promise<BranchResponseDto>;
    /**
     * Create a new branch for the authenticated merchant's business.
     */
    createBranch(user: CurrentUserPayload, input: CreateBranchDto): Promise<BranchResponseDto>;
    /**
     * Update an existing branch.
     */
    updateBranch(user: CurrentUserPayload, branchId: string, input: UpdateBranchDto): Promise<BranchResponseDto>;
    /**
     * Delete a branch.
     */
    deleteBranch(user: CurrentUserPayload, branchId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Public endpoint: Check merchant service status.
     * No authentication required.
     */
    getHealth(): Promise<{
        service: string;
        status: string;
        timestamp: string;
    }>;
}
//# sourceMappingURL=merchants.controller.d.ts.map