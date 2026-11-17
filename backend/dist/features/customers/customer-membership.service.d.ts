import { TenantContextService } from '../../shared/database/tenant-context.service';
import { JoinBusinessDto } from './dto/customer-membership.dto';
type MembershipStatus = 'active' | 'inactive';
type ProgramType = 'stamps' | 'points' | 'both';
export interface CredentialRow {
    credential: string;
    issuedAt: Date;
}
export interface PersonalQrCredentialStatus {
    issuedAt: Date;
    active: true;
}
export interface BusinessDiscoveryResponse {
    business: {
        name: string;
        description: string | null;
        logoUrl: string | null;
        theme: {
            primaryColor: string | null;
            accentColor: string | null;
        };
        branchCount: number;
    };
    program: {
        type: ProgramType;
        version: number;
    } | null;
    membership: {
        status: MembershipStatus;
    } | null;
    branch?: {
        name: string;
        address: string | null;
    };
}
export declare class CustomerMembershipService {
    private readonly tenantContext;
    constructor(tenantContext: TenantContextService);
    discoverBusiness(userId: string, businessQrId: string): Promise<BusinessDiscoveryResponse>;
    discoverBranch(userId: string, branchQrId: string): Promise<BusinessDiscoveryResponse>;
    joinBusiness(userId: string, input: JoinBusinessDto): Promise<Record<string, unknown>>;
    listMemberships(userId: string): Promise<Record<string, unknown>[]>;
    getMembership(userId: string, membershipId: string): Promise<Record<string, unknown>>;
    leaveMembership(userId: string, membershipId: string): Promise<Record<string, unknown>>;
    getPersonalQrCredential(userId: string): Promise<PersonalQrCredentialStatus>;
    issuePersonalQrCredential(userId: string): Promise<CredentialRow>;
    rotatePersonalQrCredential(userId: string): Promise<CredentialRow>;
    private getCustomerAccount;
    private lockCustomerAccount;
    private resolveJoinBusiness;
    private toDiscoveryResponse;
    private membershipSelect;
    private loadMembership;
    private toMembershipResponse;
    private recordMembershipEvent;
    private readPersonalQrCredential;
}
export {};
//# sourceMappingURL=customer-membership.service.d.ts.map