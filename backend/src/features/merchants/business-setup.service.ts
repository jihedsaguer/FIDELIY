import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { TenantContextService } from '../../shared/database/tenant-context.service';
import { StorageProvider } from '../../shared/storage/storage.provider';
import { BusinessAccessService } from './business-access.service';
import { LogoUploadService } from './services/logo-upload.service';
import {
  BusinessSetupCompletionData,
  getMissingBusinessSetupFields,
} from './business-setup-completion.policy';
import {
  CreateBusinessDto,
  CreateFirstBranchDto,
  UpdateBusinessSetupDto,
  UpdateFirstBranchDto,
} from './dto/business-setup.dto';

export type SetupStatus = 'required' | 'in_progress' | 'complete';

interface BusinessRow {
  id: string;
  publicQrId: string;
  name: string;
  description: string | null;
  branchCount: number;
  businessPhone: string | null;
  phonePubliclyDisplayed: boolean;
  phoneVisibilityConfigured: boolean;
  logoUrl: string | null;
  themePrimaryColor: string | null;
  themeAccentColor: string | null;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

@Injectable()
export class BusinessSetupService {
  private readonly logger = new Logger(BusinessSetupService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly storageProvider: StorageProvider,
    private readonly logoUploadService: LogoUploadService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

  getSetup(userId: string): Promise<BusinessSetupResponse> {
    return this.tenantContext.executeWithContext(userId, (connection) =>
      this.loadSetup(connection, userId),
    );
  }

  async createBusiness(
    userId: string,
    input: CreateBusinessDto,
  ): Promise<BusinessSetupResponse> {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('Business name is required');
    }

    await this.tenantContext.executeWithContext(userId, async (connection) => {
      const merchant = await connection.query<{ id: string }>(
        'SELECT id FROM merchant_accounts WHERE user_id = $1 LIMIT 1',
        [userId],
      );
      if (!merchant.rows[0]) {
        throw new NotFoundException('Merchant account not found');
      }

      await connection.query(
        `INSERT INTO businesses (merchant_id, name)
         VALUES ($1, $2)
         ON CONFLICT (merchant_id) DO NOTHING`,
        [merchant.rows[0].id, name],
      );
    });

    return this.getSetup(userId);
  }

  async updateBusiness(
    userId: string,
    input: UpdateBusinessSetupDto,
  ): Promise<BusinessSetupResponse> {
    await this.tenantContext.executeWithContext(userId, async (connection) => {
      const businessId = await this.lockOwnedBusiness(connection, userId);
      const assignments: string[] = [];
      const values: Array<string | boolean | null> = [];
      const add = (column: string, value: string | boolean | null) => {
        values.push(value);
        assignments.push(`${column} = $${values.length}`);
      };

      if (input.name !== undefined) add('name', input.name.trim());
      if (input.description !== undefined) add('description', input.description);
      if (input.businessPhone !== undefined) {
        add('business_phone', input.businessPhone?.trim() ?? null);
      }
      if (input.phonePubliclyDisplayed !== undefined) {
        add('phone_publicly_displayed', input.phonePubliclyDisplayed);
        add('phone_visibility_configured', true);
      }
      if (input.logoUrl !== undefined) add('logo_url', input.logoUrl ?? null);
      if (input.theme !== undefined) {
        add('theme_primary_color', input.theme?.primaryColor ?? null);
        add('theme_accent_color', input.theme?.accentColor ?? null);
      }

      if (assignments.length) {
        values.push(businessId);
        await connection.query(
          `UPDATE businesses
           SET ${assignments.join(', ')}, updated_at = now()
           WHERE id = $${values.length}`,
          values,
        );
        await this.synchronizeCompletion(connection, businessId);
      }
    });

    return this.getSetup(userId);
  }

  async createFirstBranch(
    userId: string,
    input: CreateFirstBranchDto,
  ): Promise<BusinessSetupResponse> {
    const name = input.name.trim();
    const address = input.address.trim();
    if (!name || !address) {
      throw new BadRequestException('First branch name and address are required');
    }

    await this.tenantContext.executeWithContext(userId, async (connection) => {
      const businessId = await this.lockOwnedBusiness(connection, userId);
      const existingBranch = await connection.query<{ id: string }>(
        `SELECT id
         FROM branches
         WHERE business_id = $1
         ORDER BY created_at ASC, id ASC
         LIMIT 1`,
        [businessId],
      );
      if (existingBranch.rows[0]) return;

      await connection.query(
        `INSERT INTO branches (business_id, name, address, qr_code_id)
         VALUES ($1, $2, $3, $4)`,
        [businessId, name, address, randomUUID()],
      );
      await connection.query(
        `UPDATE businesses
         SET branch_count = (
           SELECT count(*)::int FROM branches WHERE business_id = $1
         ), updated_at = now()
         WHERE id = $1`,
        [businessId],
      );
    });

    return this.getSetup(userId);
  }

  async updateFirstBranch(
    userId: string,
    input: UpdateFirstBranchDto,
  ): Promise<BusinessSetupResponse> {
    await this.tenantContext.executeWithContext(userId, async (connection) => {
      const businessId = await this.lockOwnedBusiness(connection, userId);
      const branchResult = await connection.query<{ id: string }>(
        `SELECT id
         FROM branches
         WHERE business_id = $1
         ORDER BY created_at ASC, id ASC
         LIMIT 1
         FOR UPDATE`,
        [businessId],
      );
      const branchId = branchResult.rows[0]?.id;
      if (!branchId) {
        throw new NotFoundException('First branch not found');
      }

      const assignments: string[] = [];
      const values: Array<string | null> = [];
      const add = (column: string, value: string | null) => {
        values.push(value);
        assignments.push(`${column} = $${values.length}`);
      };

      if (input.name !== undefined) add('name', input.name.trim());
      if (input.address !== undefined) add('address', input.address?.trim() ?? null);
      if (input.phone !== undefined) add('phone', input.phone?.trim() ?? null);

      if (assignments.length) {
        values.push(branchId);
        await connection.query(
          `UPDATE branches
           SET ${assignments.join(', ')}, updated_at = now()
           WHERE id = $${values.length}`,
          values,
        );
        await this.synchronizeCompletion(connection, businessId);
      }
    });

    return this.getSetup(userId);
  }

  async completeSetup(userId: string): Promise<BusinessSetupResponse> {
    await this.tenantContext.executeWithContext(userId, async (connection) => {
      const businessId = await this.lockOwnedBusiness(connection, userId);
      const result = await connection.query<BusinessSetupCompletionData>(
        `SELECT b.name,
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
         WHERE b.id = $1`,
        [businessId],
      );
      const missingFields = getMissingBusinessSetupFields(result.rows[0]);
      if (missingFields.length) {
        throw new BadRequestException({
          message: 'Business setup is incomplete',
          missingFields,
        });
      }

      await connection.query(
        'UPDATE businesses SET onboarding_completed = true, updated_at = now() WHERE id = $1',
        [businessId],
      );
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
  async uploadLogo(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<{ storageKey: string; filename: string; width: number; height: number; mimeType: string; uploadedAt: Date }> {
    let storageKey: string | undefined;
    try {
      const replacement = await this.tenantContext.executeWithContext(
        userId,
        async (connection) => {
          const businessId = await this.lockOwnedBusiness(connection, userId);
          const processedImage = await this.logoUploadService.validateAndProcessImage(
            fileBuffer,
            mimeType,
            businessId,
          );
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
          const oldLogoResult = await connection.query<{ logo_storage_key: string | null }>(
            'SELECT logo_storage_key FROM businesses WHERE id = $1 FOR UPDATE',
            [businessId],
          );
          const oldStorageKey = oldLogoResult.rows[0]?.logo_storage_key;

          // Update database with new logo metadata.
          const uploadedAt = new Date();
          await connection.query(
            `UPDATE businesses
           SET logo_storage_key = $1,
               logo_filename = $2,
               logo_width = $3,
               logo_height = $4,
               logo_mime_type = $5,
               logo_uploaded_at = $6,
               updated_at = now()
           WHERE id = $7`,
            [
              storageKey,
              processedImage.filename,
              processedImage.width,
              processedImage.height,
              processedImage.mimeType,
              uploadedAt,
              businessId,
            ],
          );

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
        },
      );

      // executeWithContext resolves only after COMMIT. Deleting earlier could
      // leave a rolled-back row pointing to a deleted prior logo.
      if (replacement.oldStorageKey) {
        try {
          await this.storageProvider.delete(replacement.oldStorageKey);
          this.logger.debug(`Deleted old logo: ${replacement.oldStorageKey}`);
        } catch (error) {
          this.logger.warn(
            `Failed to delete old logo ${replacement.oldStorageKey}: ${error}`,
          );
        }
      }
      return replacement.upload;
    } catch (error) {
      if (storageKey) {
        try {
          await this.storageProvider.delete(storageKey);
          this.logger.debug(`Rolled back uploaded file: ${storageKey}`);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to clean up uploaded file ${storageKey}: ${cleanupError}`,
          );
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
  async getLogo(
    businessId: string,
    userId: string,
  ): Promise<{ content: Buffer; contentType: string; filename: string }> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const ownedBusinessId = await this.lockOwnedBusiness(connection, userId);
      if (businessId !== ownedBusinessId) {
        throw new NotFoundException('Logo not found');
      }

      const result = await connection.query<{ logo_storage_key: string | null; logo_filename: string | null }>(
        `SELECT logo_storage_key, logo_filename
         FROM businesses
         WHERE id = $1
         LIMIT 1`,
        [ownedBusinessId],
      );

      const row = result.rows[0];
      if (!row?.logo_storage_key) {
        throw new NotFoundException('Logo not found');
      }

      const retrieved = await this.storageProvider.retrieve(row.logo_storage_key);

      return {
        content: retrieved.content,
        contentType: retrieved.contentType,
        filename: row.logo_filename || 'logo',
      };
    });
  }

  private async lockOwnedBusiness(
    connection: PoolClient,
    userId: string,
  ): Promise<string> {
    const business = await this.businessAccess.lockOwnedBusinessForUpdate(
      connection,
      userId,
    );
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business.id;
  }

  private async loadSetup(
    connection: PoolClient,
    userId: string,
  ): Promise<BusinessSetupResponse> {
    // This intentionally combines the ownership predicate with setup loading.
    // Reusing BusinessAccessService here would first fetch only an ID and then
    // require this full projection anyway; the join remains owner-scoped by the
    // authenticated user within the same TenantContext transaction.
    const businessResult = await connection.query<BusinessRow>(
      `SELECT b.id,
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
       LIMIT 1`,
      [userId],
    );
    const business = businessResult.rows[0];
    if (!business) {
      return { status: 'required' as const, business: null, branches: [] };
    }

    const branchResult = await connection.query<BranchRow>(
      `SELECT id,
              business_id AS "businessId",
              name,
              address,
              phone,
              qr_code_id AS "qrCodeId",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM branches
       WHERE business_id = $1
       ORDER BY created_at ASC, id ASC`,
      [business.id],
    );

    return {
      status: business.onboardingCompleted
        ? ('complete' as const)
        : ('in_progress' as const),
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
        theme:
          business.themePrimaryColor === null &&
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

  private async synchronizeCompletion(
    connection: PoolClient,
    businessId: string,
  ) {
    const result = await connection.query<BusinessSetupCompletionData>(
      `SELECT b.name,
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
       WHERE b.id = $1`,
      [businessId],
    );
    if (getMissingBusinessSetupFields(result.rows[0]).length) {
      await connection.query(
        'UPDATE businesses SET onboarding_completed = false, updated_at = now() WHERE id = $1',
        [businessId],
      );
    }
  }
}
