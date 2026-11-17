"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BusinessSetupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessSetupService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const tenant_context_service_1 = require("../../shared/database/tenant-context.service");
const storage_provider_1 = require("../../shared/storage/storage.provider");
const business_access_service_1 = require("./business-access.service");
const logo_upload_service_1 = require("./services/logo-upload.service");
const business_setup_completion_policy_1 = require("./business-setup-completion.policy");
let BusinessSetupService = BusinessSetupService_1 = class BusinessSetupService {
    constructor(tenantContext, storageProvider, logoUploadService, businessAccess) {
        this.tenantContext = tenantContext;
        this.storageProvider = storageProvider;
        this.logoUploadService = logoUploadService;
        this.businessAccess = businessAccess;
        this.logger = new common_1.Logger(BusinessSetupService_1.name);
    }
    getSetup(userId) {
        return this.tenantContext.executeWithContext(userId, (connection) => this.loadSetup(connection, userId));
    }
    async createBusiness(userId, input) {
        const name = input.name.trim();
        if (!name) {
            throw new common_1.BadRequestException('Business name is required');
        }
        await this.tenantContext.executeWithContext(userId, async (connection) => {
            const merchant = await connection.query('SELECT id FROM merchant_accounts WHERE user_id = $1 LIMIT 1', [userId]);
            if (!merchant.rows[0]) {
                throw new common_1.NotFoundException('Merchant account not found');
            }
            await connection.query(`INSERT INTO businesses (merchant_id, name)
         VALUES ($1, $2)
         ON CONFLICT (merchant_id) DO NOTHING`, [merchant.rows[0].id, name]);
        });
        return this.getSetup(userId);
    }
    async updateBusiness(userId, input) {
        await this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            const assignments = [];
            const values = [];
            const add = (column, value) => {
                values.push(value);
                assignments.push(`${column} = $${values.length}`);
            };
            if (input.name !== undefined)
                add('name', input.name.trim());
            if (input.description !== undefined)
                add('description', input.description);
            if (input.businessPhone !== undefined) {
                add('business_phone', input.businessPhone?.trim() ?? null);
            }
            if (input.phonePubliclyDisplayed !== undefined) {
                add('phone_publicly_displayed', input.phonePubliclyDisplayed);
                add('phone_visibility_configured', true);
            }
            if (input.logoUrl !== undefined)
                add('logo_url', input.logoUrl ?? null);
            if (input.theme !== undefined) {
                add('theme_primary_color', input.theme?.primaryColor ?? null);
                add('theme_accent_color', input.theme?.accentColor ?? null);
            }
            if (assignments.length) {
                values.push(businessId);
                await connection.query(`UPDATE businesses
           SET ${assignments.join(', ')}, updated_at = now()
           WHERE id = $${values.length}`, values);
                await this.synchronizeCompletion(connection, businessId);
            }
        });
        return this.getSetup(userId);
    }
    async createFirstBranch(userId, input) {
        const name = input.name.trim();
        const address = input.address.trim();
        if (!name || !address) {
            throw new common_1.BadRequestException('First branch name and address are required');
        }
        await this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            const existingBranch = await connection.query(`SELECT id
         FROM branches
         WHERE business_id = $1
         ORDER BY created_at ASC, id ASC
         LIMIT 1`, [businessId]);
            if (existingBranch.rows[0])
                return;
            await connection.query(`INSERT INTO branches (business_id, name, address, qr_code_id)
         VALUES ($1, $2, $3, $4)`, [businessId, name, address, (0, node_crypto_1.randomUUID)()]);
            await connection.query(`UPDATE businesses
         SET branch_count = (
           SELECT count(*)::int FROM branches WHERE business_id = $1
         ), updated_at = now()
         WHERE id = $1`, [businessId]);
        });
        return this.getSetup(userId);
    }
    async updateFirstBranch(userId, input) {
        await this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            const branchResult = await connection.query(`SELECT id
         FROM branches
         WHERE business_id = $1
         ORDER BY created_at ASC, id ASC
         LIMIT 1
         FOR UPDATE`, [businessId]);
            const branchId = branchResult.rows[0]?.id;
            if (!branchId) {
                throw new common_1.NotFoundException('First branch not found');
            }
            const assignments = [];
            const values = [];
            const add = (column, value) => {
                values.push(value);
                assignments.push(`${column} = $${values.length}`);
            };
            if (input.name !== undefined)
                add('name', input.name.trim());
            if (input.address !== undefined)
                add('address', input.address?.trim() ?? null);
            if (input.phone !== undefined)
                add('phone', input.phone?.trim() ?? null);
            if (assignments.length) {
                values.push(branchId);
                await connection.query(`UPDATE branches
           SET ${assignments.join(', ')}, updated_at = now()
           WHERE id = $${values.length}`, values);
                await this.synchronizeCompletion(connection, businessId);
            }
        });
        return this.getSetup(userId);
    }
    async completeSetup(userId) {
        await this.tenantContext.executeWithContext(userId, async (connection) => {
            const businessId = await this.lockOwnedBusiness(connection, userId);
            const result = await connection.query(`SELECT b.name,
                b.business_phone,
                b.phone_visibility_configured,
                b.logo_url,
                b.logo_storage_key,
                b.theme_primary_color,
                b.theme_accent_color,
                first_branch.name AS branch_name,
                first_branch.address AS branch_address
         FROM businesses b
         LEFT JOIN LATERAL (
           SELECT name, address
           FROM branches
           WHERE business_id = b.id
           ORDER BY created_at ASC, id ASC
           LIMIT 1
         ) first_branch ON true
         WHERE b.id = $1`, [businessId]);
            const missingFields = (0, business_setup_completion_policy_1.getMissingBusinessSetupFields)(result.rows[0]);
            if (missingFields.length) {
                throw new common_1.BadRequestException({
                    message: 'Business setup is incomplete',
                    missingFields,
                });
            }
            await connection.query('UPDATE businesses SET onboarding_completed = true, updated_at = now() WHERE id = $1', [businessId]);
        });
        return this.getSetup(userId);
    }
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
    async uploadLogo(userId, fileBuffer, mimeType) {
        let storageKey;
        try {
            const replacement = await this.tenantContext.executeWithContext(userId, async (connection) => {
                const businessId = await this.lockOwnedBusiness(connection, userId);
                const processedImage = await this.logoUploadService.validateAndProcessImage(fileBuffer, mimeType, businessId);
                storageKey = this.logoUploadService.generateStorageKey(processedImage.filename);
                // Write new file to storage.
                await this.storageProvider.upload(storageKey, {
                    content: processedImage.buffer,
                    contentType: processedImage.mimeType,
                    metadata: {
                        businessId,
                        filename: processedImage.filename,
                    },
                });
                // Read the prior key while the business row is locked.
                const oldLogoResult = await connection.query('SELECT logo_storage_key FROM businesses WHERE id = $1 FOR UPDATE', [businessId]);
                const oldStorageKey = oldLogoResult.rows[0]?.logo_storage_key;
                // Update database with new logo metadata.
                const uploadedAt = new Date();
                await connection.query(`UPDATE businesses
           SET logo_storage_key = $1,
               logo_filename = $2,
               logo_width = $3,
               logo_height = $4,
               logo_mime_type = $5,
               logo_uploaded_at = $6,
               updated_at = now()
           WHERE id = $7`, [
                    storageKey,
                    processedImage.filename,
                    processedImage.width,
                    processedImage.height,
                    processedImage.mimeType,
                    uploadedAt,
                    businessId,
                ]);
                return {
                    oldStorageKey,
                    upload: {
                        storageKey,
                        filename: processedImage.filename,
                        width: processedImage.width,
                        height: processedImage.height,
                        mimeType: processedImage.mimeType,
                        uploadedAt,
                    },
                };
            });
            // executeWithContext resolves only after COMMIT. Deleting earlier could
            // leave a rolled-back row pointing to a deleted prior logo.
            if (replacement.oldStorageKey) {
                try {
                    await this.storageProvider.delete(replacement.oldStorageKey);
                    this.logger.debug(`Deleted old logo: ${replacement.oldStorageKey}`);
                }
                catch (error) {
                    this.logger.warn(`Failed to delete old logo ${replacement.oldStorageKey}: ${error}`);
                }
            }
            return replacement.upload;
        }
        catch (error) {
            if (storageKey) {
                try {
                    await this.storageProvider.delete(storageKey);
                    this.logger.debug(`Rolled back uploaded file: ${storageKey}`);
                }
                catch (cleanupError) {
                    this.logger.error(`Failed to clean up uploaded file ${storageKey}: ${cleanupError}`);
                }
            }
            throw error;
        }
    }
    /**
     * Retrieve a business's current logo.
     *
     * @param businessId Business ID
     * @param userId User ID (for authorization check)
     * @returns Logo file content and metadata
     * @throws NotFoundException if business or logo not found
     */
    async getLogo(businessId, userId) {
        return this.tenantContext.executeWithContext(userId, async (connection) => {
            const ownedBusinessId = await this.lockOwnedBusiness(connection, userId);
            if (businessId !== ownedBusinessId) {
                throw new common_1.NotFoundException('Logo not found');
            }
            const result = await connection.query(`SELECT logo_storage_key, logo_filename
         FROM businesses
         WHERE id = $1
         LIMIT 1`, [ownedBusinessId]);
            const row = result.rows[0];
            if (!row?.logo_storage_key) {
                throw new common_1.NotFoundException('Logo not found');
            }
            const retrieved = await this.storageProvider.retrieve(row.logo_storage_key);
            return {
                content: retrieved.content,
                contentType: retrieved.contentType,
                filename: row.logo_filename || 'logo',
            };
        });
    }
    async lockOwnedBusiness(connection, userId) {
        const business = await this.businessAccess.lockOwnedBusinessForUpdate(connection, userId);
        if (!business) {
            throw new common_1.NotFoundException('Business not found');
        }
        return business.id;
    }
    async loadSetup(connection, userId) {
        // This intentionally combines the ownership predicate with setup loading.
        // Reusing BusinessAccessService here would first fetch only an ID and then
        // require this full projection anyway; the join remains owner-scoped by the
        // authenticated user within the same TenantContext transaction.
        const businessResult = await connection.query(`SELECT b.id,
              b.public_qr_id AS "publicQrId",
              b.name,
              b.description,
              b.branch_count AS "branchCount",
              b.business_phone AS "businessPhone",
              b.phone_publicly_displayed AS "phonePubliclyDisplayed",
              b.phone_visibility_configured AS "phoneVisibilityConfigured",
              b.logo_url AS "logoUrl",
              b.theme_primary_color AS "themePrimaryColor",
              b.theme_accent_color AS "themeAccentColor",
              b.onboarding_completed AS "onboardingCompleted",
              b.created_at AS "createdAt",
              b.updated_at AS "updatedAt"
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       LIMIT 1`, [userId]);
        const business = businessResult.rows[0];
        if (!business) {
            return { status: 'required', business: null, branches: [] };
        }
        const branchResult = await connection.query(`SELECT id,
              business_id AS "businessId",
              name,
              address,
              phone,
              qr_code_id AS "qrCodeId",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM branches
       WHERE business_id = $1
       ORDER BY created_at ASC, id ASC`, [business.id]);
        return {
            status: business.onboardingCompleted
                ? 'complete'
                : 'in_progress',
            business: {
                id: business.id,
                publicQrId: business.publicQrId,
                name: business.name,
                description: business.description,
                branchCount: business.branchCount,
                businessPhone: business.businessPhone,
                phonePubliclyDisplayed: business.phonePubliclyDisplayed,
                phoneVisibilityConfigured: business.phoneVisibilityConfigured,
                logoUrl: business.logoUrl,
                theme: business.themePrimaryColor === null &&
                    business.themeAccentColor === null
                    ? null
                    : {
                        primaryColor: business.themePrimaryColor,
                        accentColor: business.themeAccentColor,
                    },
                onboardingCompleted: business.onboardingCompleted,
                createdAt: business.createdAt,
                updatedAt: business.updatedAt,
            },
            branches: branchResult.rows,
        };
    }
    async synchronizeCompletion(connection, businessId) {
        const result = await connection.query(`SELECT b.name,
              b.business_phone,
              b.phone_visibility_configured,
              b.logo_url,
              b.logo_storage_key,
              b.theme_primary_color,
              b.theme_accent_color,
              first_branch.name AS branch_name,
              first_branch.address AS branch_address
       FROM businesses b
       LEFT JOIN LATERAL (
         SELECT name, address
         FROM branches
         WHERE business_id = b.id
         ORDER BY created_at ASC, id ASC
         LIMIT 1
       ) first_branch ON true
       WHERE b.id = $1`, [businessId]);
        if ((0, business_setup_completion_policy_1.getMissingBusinessSetupFields)(result.rows[0]).length) {
            await connection.query('UPDATE businesses SET onboarding_completed = false, updated_at = now() WHERE id = $1', [businessId]);
        }
    }
};
exports.BusinessSetupService = BusinessSetupService;
exports.BusinessSetupService = BusinessSetupService = BusinessSetupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_context_service_1.TenantContextService,
        storage_provider_1.StorageProvider,
        logo_upload_service_1.LogoUploadService,
        business_access_service_1.BusinessAccessService])
], BusinessSetupService);
//# sourceMappingURL=business-setup.service.js.map