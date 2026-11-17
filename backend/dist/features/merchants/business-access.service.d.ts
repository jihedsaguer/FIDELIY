import type { PoolClient } from 'pg';
export interface OwnedBusinessRef {
    id: string;
}
export interface SharedOwnedBusiness extends OwnedBusinessRef {
    merchantAccountId: string;
}
/**
 * Merchant-owned business lookups. Runs on the caller's transaction
 * and does not open a TenantContext of its own.
 */
export declare class BusinessAccessService {
    findOwnedBusiness(connection: PoolClient, userId: string): Promise<OwnedBusinessRef | null>;
    lockOwnedBusinessForUpdate(connection: PoolClient, userId: string): Promise<OwnedBusinessRef | null>;
    shareOwnedBusiness(connection: PoolClient, userId: string): Promise<SharedOwnedBusiness | null>;
}
//# sourceMappingURL=business-access.service.d.ts.map