import { TenantContextService } from '../../shared/database/tenant-context.service';
import { StorageProvider } from '../../shared/storage/storage.provider';
import { BusinessAccessService } from './business-access.service';
import { LogoUploadService } from './services/logo-upload.service';
import { CreateBusinessDto, CreateFirstBranchDto, UpdateBusinessSetupDto, UpdateFirstBranchDto } from './dto/business-setup.dto';
export type SetupStatus = 'required' | 'in_progress' | 'complete';
export interface BranchRow {
    id: string;
    businessId: string;
    name: string;
    address: string | null;
    phone: string | null;
    qrCodeId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface BusinessSetupResponse {
    status: SetupStatus;
    business: {
        id: string;
        publicQrId: string;
        name: string;
        description: string | null;
        branchCount: number;
        businessPhone: string | null;
        phonePubliclyDisplayed: boolean;
        phoneVisibilityConfigured: boolean;
        logoUrl: string | null;
        theme: {
            primaryColor: string | null;
            accentColor: string | null;
        } | null;
        onboardingCompleted: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null;
    branches: BranchRow[];
}
export declare class BusinessSetupService {
    private readonly tenantContext;
    private readonly storageProvider;
    private readonly logoUploadService;
    private readonly businessAccess;
    private readonly logger;
    constructor(tenantContext: TenantContextService, storageProvider: StorageProvider, logoUploadService: LogoUploadService, businessAccess: BusinessAccessService);
    getSetup(userId: string): Promise<BusinessSetupResponse>;
    createBusiness(userId: string, input: CreateBusinessDto): Promise<BusinessSetupResponse>;
    updateBusiness(userId: string, input: UpdateBusinessSetupDto): Promise<BusinessSetupResponse>;
    createFirstBranch(userId: string, input: CreateFirstBranchDto): Promise<BusinessSetupResponse>;
    updateFirstBranch(userId: string, input: UpdateFirstBranchDto): Promise<BusinessSetupResponse>;
    completeSetup(userId: string): Promise<BusinessSetupResponse>;
    /**
     * Upload and store a device-based logo for a business.
     * Validates image content, processes it, and safely replaces existing logo if present.
     *
     * @param userId Authenticated merchant user ID
     * @param fileBuffer Raw file content
     * @param mimeType Client-provided MIME type (validated against actual content)
     * @returns Logo upload response with storage key and metadata
     * @throws BadRequestException if validation fails
     * @throws NotFoundException if business not found
     */
    uploadLogo(userId: string, fileBuffer: Buffer, mimeType: string): Promise<{
        storageKey: string;
        filename: string;
        width: number;
        height: number;
        mimeType: string;
        uploadedAt: Date;
    }>;
    /**
     * Retrieve a business's current logo.
     *
     * @param businessId Business ID
     * @param userId User ID (for authorization check)
     * @returns Logo file content and metadata
     * @throws NotFoundException if business or logo not found
     */
    getLogo(businessId: string, userId: string): Promise<{
        content: Buffer;
        contentType: string;
        filename: string;
    }>;
    private lockOwnedBusiness;
    private loadSetup;
    private synchronizeCompletion;
}
//# sourceMappingURL=business-setup.service.d.ts.map