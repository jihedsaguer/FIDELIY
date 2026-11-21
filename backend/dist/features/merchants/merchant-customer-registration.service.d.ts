import { TenantContextService } from '../../shared/database/tenant-context.service';
import { PhoneAuthService } from '../auth/phone-auth.service';
import { BusinessAccessService } from './business-access.service';
import { RegisterCustomerDto, RegisterCustomerResponse } from './dto/register-customer.dto';
/**
 * Service for merchant-assisted customer registration.
 *
 * Responsibilities:
 * - Validate merchant ownership of business
 * - Validate customer phone uniqueness
 * - Create user account (if not exists)
 * - Create customer account (if not exists)
 * - Create business membership
 * - Issue personal QR credential (hash only stored)
 * - Return registration result WITHOUT creating a customer session
 */
export declare class MerchantCustomerRegistrationService {
    private readonly tenantContext;
    private readonly phoneAuthService;
    private readonly businessAccess;
    constructor(tenantContext: TenantContextService, phoneAuthService: PhoneAuthService, businessAccess: BusinessAccessService);
    /**
     * Register a customer on behalf of a merchant.
     *
     * This method:
     * 1. Validates the merchant owns a business
     * 2. Validates the phone number format
     * 3. Checks for existing customer with this phone
     * 4. Creates user if doesn't exist
     * 5. Creates customer account if doesn't exist
     * 6. Creates business membership
     * 7. Issues personal QR credential (returns raw value once, stores hash only)
     * 8. Returns result WITHOUT creating a session
     *
     * @param merchantUserId - Authenticated merchant user ID
     * @param dto - Customer registration data
     * @returns Registration result with customer, membership, and QR credential
     * @throws BadRequestException - Invalid phone number
     * @throws ConflictException - Customer already exists with this phone
     * @throws NotFoundException - Merchant has no business
     */
    registerCustomer(merchantUserId: string, dto: RegisterCustomerDto): Promise<RegisterCustomerResponse>;
    /**
     * Find customer by phone number.
     */
    private findCustomerByPhone;
    /**
     * Create a new user account.
     */
    private createUser;
    /**
     * Create a customer account for a user.
     */
    private createCustomerAccount;
    /**
     * Find active membership for customer in business.
     */
    private findActiveMembership;
    /**
     * Create a new business membership for a customer.
     */
    private createMembership;
    /**
     * Issue a personal QR credential for a customer account.
     *
     * Security: Only the SHA-256 hash is stored in the database.
     * The raw credential is returned ONCE (for new customers only).
     * For existing customers, returns undefined since we cannot retrieve the raw value
     * from the hash.
     *
     * @param connection - Database connection
     * @param customerAccountId - Customer account ID
     * @param isExistingCustomer - True if customer already existed before this registration
     * @returns Raw credential for NEW customers only, undefined for existing customers
     */
    private issuePersonalQrCredential;
    /**
     * Get business name by ID.
     */
    private getBusinessName;
    /**
     * Record a membership lifecycle event.
     */
    private recordMembershipEvent;
}
//# sourceMappingURL=merchant-customer-registration.service.d.ts.map