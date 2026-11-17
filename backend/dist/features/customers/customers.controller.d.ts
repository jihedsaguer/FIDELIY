import { CurrentUserPayload } from '../../shared/decorators/current-user.decorator';
import { CustomerMembershipService } from './customer-membership.service';
import { JoinBusinessDto } from './dto/customer-membership.dto';
export declare class CustomersController {
    private readonly customerMemberships;
    constructor(customerMemberships: CustomerMembershipService);
    /**
     * Get customer profile.
     * Requires CustomerGuard (authenticated user with customer account).
     *
     * Success: 200 OK with user and customer account info
     * No session: 401 Unauthorized
     * No customer account: 403 Forbidden
     */
    getCustomerProfile(user: CurrentUserPayload): Promise<{
        message: string;
        userId: string;
        customerAccount: any;
        timestamp: string;
    }>;
    /**
     * Test endpoint: Get customer dashboard.
     * Requires CustomerGuard.
     */
    getCustomerDashboard(user: CurrentUserPayload): Promise<{
        message: string;
        userId: string;
        timestamp: string;
        note: string;
    }>;
    discoverBusiness(user: CurrentUserPayload, businessQrId: string): Promise<import("./customer-membership.service").BusinessDiscoveryResponse>;
    discoverBranch(user: CurrentUserPayload, branchQrId: string): Promise<import("./customer-membership.service").BusinessDiscoveryResponse>;
    joinBusiness(user: CurrentUserPayload, input: JoinBusinessDto): Promise<Record<string, unknown>>;
    listMemberships(user: CurrentUserPayload): Promise<Record<string, unknown>[]>;
    getMembership(user: CurrentUserPayload, membershipId: string): Promise<Record<string, unknown>>;
    leaveMembership(user: CurrentUserPayload, membershipId: string): Promise<Record<string, unknown>>;
    getPersonalQrCredential(user: CurrentUserPayload): Promise<import("./customer-membership.service").PersonalQrCredentialStatus>;
    issuePersonalQrCredential(user: CurrentUserPayload): Promise<import("./customer-membership.service").CredentialRow>;
    rotatePersonalQrCredential(user: CurrentUserPayload): Promise<import("./customer-membership.service").CredentialRow>;
    /**
     * Public endpoint: Check customer service status.
     * No authentication required.
     */
    getHealth(): Promise<{
        service: string;
        status: string;
        timestamp: string;
    }>;
}
//# sourceMappingURL=customers.controller.d.ts.map