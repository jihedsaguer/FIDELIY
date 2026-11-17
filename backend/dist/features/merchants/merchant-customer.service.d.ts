import { TenantContextService } from '../../shared/database/tenant-context.service';
import { BusinessAccessService } from './business-access.service';
export declare class MerchantCustomerService {
    private readonly tenantContext;
    private readonly businessAccess;
    constructor(tenantContext: TenantContextService, businessAccess: BusinessAccessService);
    resolveCustomerQr(userId: string, credential: string): Promise<{
        customer: {
            name: string;
        };
        membership: {
            status: "active";
            joinedAt: Date;
        };
    }>;
    private getOwnedBusiness;
}
//# sourceMappingURL=merchant-customer.service.d.ts.map