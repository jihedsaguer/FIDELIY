import { TenantContextService } from '../../shared/database/tenant-context.service';
import { BusinessAccessService } from '../merchants/business-access.service';
export type LoyaltyTransactionCategory = 'purchase' | 'manual_adjustment' | 'reversal';
export type LoyaltyActivityType = 'stamps' | 'points';
export interface CreateLoyaltyLedgerEntry {
    activityType: LoyaltyActivityType;
    delta: number;
    programConfigurationId: string;
    reversesEntryId?: string;
}
export interface CreateLoyaltyTransaction {
    membershipId: string;
    branchId?: string;
    category: LoyaltyTransactionCategory;
    idempotencyKey: string;
    occurredAt?: Date;
    reversesTransactionId?: string;
    entries: CreateLoyaltyLedgerEntry[];
}
interface ActivityRow {
    id: string;
    activityType: LoyaltyActivityType;
    delta: number;
    programConfigurationId: string;
    reversesEntryId: string | null;
}
export declare class LoyaltyLedgerService {
    private readonly tenantContext;
    private readonly businessAccess;
    constructor(tenantContext: TenantContextService, businessAccess: BusinessAccessService);
    createTransaction(authenticatedUserId: string, input: CreateLoyaltyTransaction): Promise<{
        id: string;
        entries: ActivityRow[];
    }>;
    private createWithinTransaction;
    private getOwnedBusiness;
    private findByIdempotencyKey;
    private returnIdempotentResult;
    private validateMembership;
    private validateBranch;
    private validateConfigurations;
    private validateReversal;
    private validateInput;
    private fingerprint;
}
export {};
//# sourceMappingURL=loyalty-ledger.service.d.ts.map