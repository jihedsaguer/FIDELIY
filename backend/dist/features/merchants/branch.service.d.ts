import { TenantContextService } from '../../shared/database/tenant-context.service';
import { BusinessAccessService } from './business-access.service';
import { CreateBranchDto, UpdateBranchDto, BranchResponseDto, BranchListResponseDto } from './dto/branch.dto';
export declare class BranchService {
    private readonly tenantContext;
    private readonly businessAccess;
    constructor(tenantContext: TenantContextService, businessAccess: BusinessAccessService);
    listBranches(userId: string): Promise<BranchListResponseDto>;
    getBranch(userId: string, branchId: string): Promise<BranchResponseDto>;
    createBranch(userId: string, input: CreateBranchDto): Promise<BranchResponseDto>;
    updateBranch(userId: string, branchId: string, input: UpdateBranchDto): Promise<BranchResponseDto>;
    deleteBranch(userId: string, branchId: string): Promise<void>;
    private getOwnedBusinessId;
    private lockOwnedBusiness;
    private mapRowToDto;
}
//# sourceMappingURL=branch.service.d.ts.map