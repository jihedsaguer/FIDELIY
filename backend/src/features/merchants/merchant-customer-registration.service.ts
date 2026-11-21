import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type { PoolClient } from 'pg';

import { TenantContextService } from '../../shared/database/tenant-context.service';
import { hashCustomerQrCredential } from '../../shared/security/customer-qr';
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
@Injectable()
export class MerchantCustomerRegistrationService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly phoneAuthService: PhoneAuthService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

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
  async registerCustomer(
    merchantUserId: string,
    dto: RegisterCustomerDto,
  ): Promise<RegisterCustomerResponse> {
    // Normalize and validate phone number
    const normalized = this.phoneAuthService.normalizePhoneNumber(dto.phoneNumber);
    if (!normalized || !this.phoneAuthService.isValidTunisianPhone(normalized)) {
      throw new BadRequestException(
        'Invalid phone number. Use 8-digit Tunisian format: XXXXXXXX',
      );
    }

    return this.tenantContext.executeWithContext(
      merchantUserId,
      async (connection) => {
        // Get merchant's owned business
        const business = await this.businessAccess.lockOwnedBusinessForUpdate(
          connection,
          merchantUserId,
        );
        
        if (!business) {
          throw new NotFoundException('Merchant business not found');
        }

        // Check if customer with this phone already exists
        const existingCustomer = await this.findCustomerByPhone(
          connection,
          normalized,
        );

        let customerUserId: string;
        let customerAccountId: string;

        if (existingCustomer) {
          customerUserId = existingCustomer.userId;
          customerAccountId = existingCustomer.customerAccountId;
        } else {
          // Create new user
          customerUserId = await this.createUser(connection, dto.name, normalized, dto.birthdate);
          
          // Create customer account
          customerAccountId = await this.createCustomerAccount(
            connection,
            customerUserId,
            normalized,
          );
        }

        // Check if customer already has membership in this business
        const existingMembership = await this.findActiveMembership(
          connection,
          customerAccountId,
          business.id,
        );

        let membershipId: string;

        if (existingMembership) {
          // Reactivate if inactive
          if (existingMembership.status === 'inactive') {
            await connection.query(
              `UPDATE customer_business_memberships 
               SET status = 'active', left_at = NULL, updated_at = now()
               WHERE id = $1`,
              [existingMembership.id],
            );
            
            await this.recordMembershipEvent(
              connection,
              existingMembership.id,
              'joined',
            );
            membershipId = existingMembership.id;
          } else {
            // Already active - this shouldn't happen but handle gracefully
            membershipId = existingMembership.id;
          }
        } else {
          // Create new membership
          membershipId = await this.createMembership(
            connection,
            customerAccountId,
            business.id,
          );
        }

        // Issue personal QR credential - returns raw value once, stores hash only
        const personalQrCredential = await this.issuePersonalQrCredential(
          connection,
          customerAccountId,
          existingCustomer !== undefined, // true if customer already existed
        );

        // Get business name for response
        const businessName = await this.getBusinessName(connection, business.id);

        return {
          customer: {
            id: customerUserId,
            name: dto.name,
            phoneNumber: normalized,
            birthdate: dto.birthdate,
          },
          membership: {
            id: membershipId,
            businessId: business.id,
            businessName,
            status: 'active' as const,
            joinedAt: new Date().toISOString(),
          },
          personalQrCredential,
        };
      },
    );
  }

  /**
   * Find customer by phone number.
   */
  private async findCustomerByPhone(
    connection: PoolClient,
    phoneNumber: string,
  ): Promise<{ userId: string; customerAccountId: string } | null> {
    const result = await connection.query<{
      userId: string;
      customerAccountId: string;
    }>(
      `SELECT u.id AS "userId", ca.id AS "customerAccountId"
       FROM users u
       JOIN customer_accounts ca ON ca.user_id = u.id
       WHERE u.phone_number = $1
       LIMIT 1`,
      [phoneNumber],
    );

    return result.rows[0] ?? null;
  }

  /**
   * Create a new user account.
   */
  private async createUser(
    connection: PoolClient,
    name: string,
    phoneNumber: string,
    birthdate?: string,
  ): Promise<string> {
    const result = await connection.query<{ id: string }>(
      `INSERT INTO users (name, phone_number, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (phone_number) DO UPDATE
         SET name = COALESCE(users.name, EXCLUDED.name),
             updated_at = now()
       RETURNING id`,
      [name, phoneNumber],
    );

    // If there was a conflict (phone already exists but no customer account),
    // we need to create the customer account separately
    const user = result.rows[0];
    if (!user?.id) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    return user.id;
  }

  /**
   * Create a customer account for a user.
   */
  private async createCustomerAccount(
    connection: PoolClient,
    userId: string,
    phoneNumber: string,
  ): Promise<string> {
    const result = await connection.query<{ id: string }>(
      `INSERT INTO customer_accounts (user_id, phone_number, phone_verified, joined_at, created_at, updated_at)
       VALUES ($1, $2, false, now(), now(), now())
       ON CONFLICT (user_id) DO NOTHING
       RETURNING id`,
      [userId, phoneNumber],
    );

    const customerAccount = result.rows[0];
    if (customerAccount?.id) {
      return customerAccount.id;
    }

    // If ON CONFLICT did nothing (customer account already exists), fetch it
    const existing = await connection.query<{ id: string }>(
      `SELECT id FROM customer_accounts WHERE user_id = $1 LIMIT 1`,
      [userId],
    );

    if (existing.rows[0]?.id) {
      return existing.rows[0].id;
    }

    throw new Error('Failed to create or retrieve customer account');
  }

  /**
   * Find active membership for customer in business.
   */
  private async findActiveMembership(
    connection: PoolClient,
    customerAccountId: string,
    businessId: string,
  ): Promise<{ id: string; status: string } | null> {
    const result = await connection.query<{ id: string; status: string }>(
      `SELECT id, status 
       FROM customer_business_memberships 
       WHERE customer_account_id = $1 AND business_id = $2
       LIMIT 1`,
      [customerAccountId, businessId],
    );

    return result.rows[0] ?? null;
  }

  /**
   * Create a new business membership for a customer.
   */
  private async createMembership(
    connection: PoolClient,
    customerAccountId: string,
    businessId: string,
  ): Promise<string> {
    const result = await connection.query<{ id: string }>(
      `INSERT INTO customer_business_memberships 
         (customer_account_id, business_id, status, joined_at, created_at, updated_at)
       VALUES ($1, $2, 'active', now(), now(), now())
       ON CONFLICT (customer_account_id, business_id) DO NOTHING
       RETURNING id`,
      [customerAccountId, businessId],
    );

    const membership = result.rows[0];
    if (membership?.id) {
      await this.recordMembershipEvent(
        connection,
        membership.id,
        'joined',
      );
      return membership.id;
    }

    // If ON CONFLICT did nothing, fetch the existing membership
    const existing = await connection.query<{ id: string }>(
      `SELECT id FROM customer_business_memberships 
       WHERE customer_account_id = $1 AND business_id = $2
       LIMIT 1`,
      [customerAccountId, businessId],
    );

    if (existing.rows[0]?.id) {
      return existing.rows[0].id;
    }

    throw new Error('Failed to create or retrieve membership');
  }

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
  private async issuePersonalQrCredential(
    connection: PoolClient,
    customerAccountId: string,
    isExistingCustomer: boolean,
  ): Promise<string | undefined> {
    // Check for existing active QR credential
    const existingResult = await connection.query<{ credentialHash: string }>(
      `SELECT credential_hash 
       FROM customer_qr_credentials 
       WHERE customer_account_id = $1 AND revoked_at IS NULL
       LIMIT 1`,
      [customerAccountId],
    );

    if (existingResult.rows[0]?.credentialHash) {
      // Customer already has a QR credential (hash only stored)
      // We cannot retrieve the raw credential from the hash
      // Return undefined - the merchant should not regenerate it
      return undefined;
    }

    // Customer has no QR credential - generate a new one
    // Return the raw value ONCE for the merchant to display to the new customer
    // Only store the hash in the database
    const credential = crypto.randomBytes(32).toString('base64url');
    const credentialHash = hashCustomerQrCredential(credential);

    await connection.query(
      `INSERT INTO customer_qr_credentials 
         (customer_account_id, credential_hash, issued_at)
       VALUES ($1, $2, now())`,
      [customerAccountId, credentialHash],
    );

    return credential;
  }

  /**
   * Get business name by ID.
   */
  private async getBusinessName(
    connection: PoolClient,
    businessId: string,
  ): Promise<string> {
    const result = await connection.query<{ name: string }>(
      `SELECT name FROM businesses WHERE id = $1 LIMIT 1`,
      [businessId],
    );

    const business = result.rows[0];
    if (!business?.name) {
      throw new NotFoundException('Business not found');
    }

    return business.name;
  }

  /**
   * Record a membership lifecycle event.
   */
  private async recordMembershipEvent(
    connection: PoolClient,
    membershipId: string,
    type: 'joined' | 'left',
  ): Promise<void> {
    await connection.query(
      `INSERT INTO membership_lifecycle_events (membership_id, type, occurred_at)
       VALUES ($1, $2, now())`,
      [membershipId, type],
    );
  }
}
