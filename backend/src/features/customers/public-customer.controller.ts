import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Res,
  Req,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { SignJWT } from 'jose';
import { DatabaseService } from '../../database/database.service';
import { AuthService } from '../auth/auth.service';
import { PhoneAuthService } from '../auth/phone-auth.service';
import { deriveCustomerQrCodes } from '../../shared/security/customer-qr';
import {
  PublicJoinBusinessDto,
  PublicCustomerLookupDto,
  PublicBusinessDiscoveryResponse,
  PublicCustomerLookupResponse,
  PublicJoinBusinessResponse,
} from './dto/public-customer.dto';

/**
 * Public Customer Controller
 *
 * Provides unauthenticated endpoints for customer onboarding via QR codes.
 * These endpoints do NOT require authentication and are accessible to the public.
 *
 * Endpoints:
 * - GET /public/businesses/qr/:qrId - Discover business information from QR code
 * - POST /public/customers/lookup - Look up existing customer by phone number
 * - POST /public/customers/join - Join a business and create customer account
 *
 * Security Notes:
 * - No @UseGuards() - these are public endpoints
 * - Rate limiting should be applied at the infrastructure level
 * - Phone lookup without OTP is an accepted MVP security limitation
 * - Session creation uses existing Better Auth infrastructure
 */
@Controller('public')
export class PublicCustomerController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService,
    private readonly phoneAuthService: PhoneAuthService,
  ) {}

  /**
   * Discover business information from a public QR code.
   * 
   * This endpoint resolves a business or branch QR identifier to public information
   * that can be displayed to a customer before they join.
   *
   * @param qrId - The business public_qr_id or branch qr_code_id
   * @returns Business information including name, description, logo, theme, and active programme
   * @throws NotFoundException if the QR identifier is not found
   */
  @Get('/businesses/qr/:qrId')
  async discoverBusiness(
    @Param('qrId', new ParseUUIDPipe()) qrId: string,
  ): Promise<PublicBusinessDiscoveryResponse> {
    const pool = this.databaseService.getPool();
    let connection;

    try {
      connection = await pool.connect();

      // Try to find as business public_qr_id first
      const businessResult = await connection.query(
        `SELECT b.id AS "businessId",
                b.name,
                b.description,
                b.logo_url AS "logoUrl",
                b.theme_primary_color AS "themePrimaryColor",
                b.theme_accent_color AS "themeAccentColor",
                b.branch_count AS "branchCount",
                p.id AS "programId",
                p.type AS "programType",
                p.version AS "programVersion",
                p.name AS "programName",
                p.description AS "programDescription"
         FROM businesses b
         LEFT JOIN programs p ON p.business_id = b.id AND p.status = 'active'
         WHERE b.public_qr_id = $1
         LIMIT 1`,
        [qrId],
      );

      if (businessResult.rows.length > 0) {
        const row = businessResult.rows[0];
        return {
          business: {
            id: row.businessId,
            name: row.name,
            description: row.description,
            logoUrl: row.logoUrl,
            theme: {
              primaryColor: row.themePrimaryColor,
              accentColor: row.themeAccentColor,
            },
            branchCount: row.branchCount,
          },
          program: row.programType
            ? {
                type: row.programType as 'stamps' | 'points' | 'both',
                version: row.programVersion,
                name: row.programName,
                description: row.programDescription,
              }
            : null,
        };
      }

      // Try to find as branch qr_code_id
      const branchResult = await connection.query(
        `SELECT b.id AS "businessId",
                b.name AS "businessName",
                b.description AS "businessDescription",
                b.logo_url AS "logoUrl",
                b.theme_primary_color AS "themePrimaryColor",
                b.theme_accent_color AS "themeAccentColor",
                b.branch_count AS "branchCount",
                br.id AS "branchId",
                br.name AS "branchName",
                br.address AS "branchAddress",
                br.phone AS "branchPhone",
                p.id AS "programId",
                p.type AS "programType",
                p.version AS "programVersion",
                p.name AS "programName",
                p.description AS "programDescription"
         FROM branches br
         JOIN businesses b ON b.id = br.business_id
         LEFT JOIN programs p ON p.business_id = b.id AND p.status = 'active'
         WHERE br.qr_code_id = $1
         LIMIT 1`,
        [qrId],
      );

      if (branchResult.rows.length > 0) {
        const row = branchResult.rows[0];
        return {
          business: {
            id: row.businessId,
            name: row.businessName,
            description: row.businessDescription,
            logoUrl: row.logoUrl,
            theme: {
              primaryColor: row.themePrimaryColor,
              accentColor: row.themeAccentColor,
            },
            branchCount: row.branchCount,
          },
          program: row.programType
            ? {
                type: row.programType as 'stamps' | 'points' | 'both',
                version: row.programVersion,
                name: row.programName,
                description: row.programDescription,
              }
            : null,
          branch: {
            id: row.branchId,
            name: row.branchName,
            address: row.branchAddress,
            phone: row.branchPhone,
          },
        };
      }

      throw new NotFoundException('Business or branch QR code not found');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('[PublicCustomerController] Business discovery error:', error);
      throw new NotFoundException('Business or branch QR code not found');
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Look up an existing customer by phone number.
   * 
   * This endpoint checks if a customer with the given phone number already exists.
   * Used during onboarding to prevent duplicate customer identities.
   * 
   * IMPORTANT: This does NOT verify phone ownership (no OTP required).
   * This is an accepted MVP security limitation - phone lookup is for account
   * recognition only, not authentication.
   * 
   * To prevent account enumeration:
   * - Return the same response structure whether customer exists or not
   * - Only reveal minimal information (existence, not full details)
   * - Full customer data is only returned after successful join
   *
   * @param dto - Phone number to look up
   * @returns Whether a customer exists with this phone number
   * @throws BadRequestException if phone number is invalid
   */
  @Post('/customers/lookup')
  async lookupCustomer(
    @Body() dto: PublicCustomerLookupDto,
  ): Promise<PublicCustomerLookupResponse> {
    // Normalize and validate phone number
    const normalized = this.phoneAuthService.normalizePhoneNumber(dto.phoneNumber);
    if (!normalized || !this.phoneAuthService.isValidTunisianPhone(normalized)) {
      throw new BadRequestException(
        'Invalid phone number. Use 8-digit Tunisian format: XXXXXXXX',
      );
    }

    const pool = this.databaseService.getPool();
    let connection;

    try {
      connection = await pool.connect();

      // Check if customer account exists with this phone number
      const customerResult = await connection.query(
        `SELECT u.id AS "userId",
                u.name,
                u.phone_number AS "phoneNumber",
                u.email,
                ca.id AS "customerAccountId"
         FROM users u
         JOIN customer_accounts ca ON ca.user_id = u.id
         WHERE u.phone_number = $1
         LIMIT 1`,
        [normalized],
      );

      if (customerResult.rows.length === 0) {
        // Customer does not exist
        // Return same structure to avoid enumeration
        return {
          exists: false,
        };
      }

      const customer = customerResult.rows[0];

      // Get customer's memberships
      const membershipsResult = await connection.query(
        `SELECT m.business_id AS "businessId",
                b.name AS "businessName",
                m.status AS "status"
         FROM customer_business_memberships m
         JOIN businesses b ON b.id = m.business_id
         WHERE m.customer_account_id = $1
         ORDER BY m.joined_at DESC`,
        [customer.customerAccountId],
      );

      return {
        exists: true,
        customer: {
          id: customer.userId,
          name: customer.name,
          phoneNumber: customer.phoneNumber,
          birthdate: undefined, // Not stored in users table currently
          hasMembership: membershipsResult.rows.length > 0,
          memberships: membershipsResult.rows.map((row) => ({
            businessId: row.businessId,
            businessName: row.businessName,
            status: row.status as 'active' | 'inactive',
          })),
        },
      };
    } catch (error) {
      console.error('[PublicCustomerController] Customer lookup error:', error);
      // Return same structure to avoid enumeration
      return {
        exists: false,
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Join a business and create a customer account.
   * 
   * This is the main onboarding endpoint. It:
   * 1. Finds or creates a customer user and customer account
   * 2. Creates a business membership for the customer
   * 3. Issues a personal QR credential
   * 4. Creates and returns an HTTP-only session
   * 
   * The customer can then immediately access their dashboard with the session.
   * 
   * @param dto - Join business request with customer info
   * @param res - Express response for setting cookies
   * @returns Customer, membership, QR credential, and session information
   * @throws BadRequestException if phone number is invalid
   * @throws NotFoundException if business QR code is not found
   * @throws ConflictException if customer already has active membership
   */
  @Post('/customers/join')
  async joinBusiness(
    @Body() dto: PublicJoinBusinessDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    // Normalize and validate phone number
    const normalized = this.phoneAuthService.normalizePhoneNumber(dto.phoneNumber);
    if (!normalized || !this.phoneAuthService.isValidTunisianPhone(normalized)) {
      res.status(400).json({
        error: 'Invalid phone number. Use 8-digit Tunisian format: XXXXXXXX',
      });
      return;
    }

    const pool = this.databaseService.getPool();
    let connection;

    try {
      connection = await pool.connect();
      await connection.query('BEGIN');

      // Step 1: Resolve business from QR ID
      let businessId: string;
      let businessName: string;
      let branchId: string | undefined;

      // Try as business public_qr_id
      const businessResult = await connection.query<{ id: string; name: string }>(
        'SELECT id, name FROM businesses WHERE public_qr_id = $1 LIMIT 1',
        [dto.qrId],
      );

      if (businessResult.rows.length > 0) {
        businessId = businessResult.rows[0].id;
        businessName = businessResult.rows[0].name;

        // If branchQrId is also provided, find the specific branch
        if (dto.branchQrId) {
          const branchResult = await connection.query<{ id: string }>(
            'SELECT id FROM branches WHERE qr_code_id = $1 AND business_id = $2 LIMIT 1',
            [dto.branchQrId, businessId],
          );
          if (branchResult.rows.length > 0) {
            branchId = branchResult.rows[0].id;
          }
        }
      } else {
        // Try as branch qr_code_id
        const branchBusinessResult = await connection.query<{
          businessId: string;
          businessName: string;
          branchId: string;
        }>(
          `SELECT b.id AS "businessId", b.name AS "businessName", br.id AS "branchId"
           FROM branches br
           JOIN businesses b ON b.id = br.business_id
           WHERE br.qr_code_id = $1
           LIMIT 1`,
          [dto.qrId],
        );

        if (branchBusinessResult.rows.length > 0) {
          businessId = branchBusinessResult.rows[0].businessId;
          businessName = branchBusinessResult.rows[0].businessName;
          branchId = branchBusinessResult.rows[0].branchId;
        } else {
          throw new NotFoundException('Business or branch QR code not found');
        }
      }

      // Check if business has an active programme
      const programmeResult = await connection.query<{ id: string }>(
        'SELECT id FROM programs WHERE business_id = $1 AND status = \'active\' LIMIT 1',
        [businessId],
      );

      if (programmeResult.rows.length === 0) {
        throw new ConflictException(
          'This business does not have an active loyalty programme',
        );
      }

      // Step 2: Use phone sign-in to create/find user, customer account, and session
      // This reuses AuthService.phoneSignIn() for consistent session creation
      const phoneSignInResult = await this.authService.phoneSignIn(normalized);
      const userId = phoneSignInResult.user.id;
      
      // Get customer account ID
      let customerAccountId: string;
      const customerAccountResult = await connection.query<{ id: string }>(
        'SELECT id FROM customer_accounts WHERE user_id = $1 LIMIT 1',
        [userId],
      );
      
      if (customerAccountResult.rows.length > 0) {
        customerAccountId = customerAccountResult.rows[0].id;
      } else {
        // Should not happen since phoneSignIn creates customer account, but handle just in case
        const createCaResult = await connection.query<{ id: string }>(
          `INSERT INTO customer_accounts 
             (user_id, phone_number, phone_verified, created_at, updated_at, joined_at)
           VALUES ($1, $2, false, now(), now(), now())
           RETURNING id`,
          [userId, normalized],
        );
        customerAccountId = createCaResult.rows[0].id;
      }

      // Update user name if provided
      if (dto.name) {
        await connection.query(
          'UPDATE users SET name = $1 WHERE id = $2',
          [dto.name, userId],
        );
      }

      // Use the session from phoneSignIn
      const sessionToken = phoneSignInResult.session.token;
      const sessionExpiresAt = new Date(phoneSignInResult.session.expiresAt);

      // Step 3: Create or reactivate membership
      let membershipId: string;

      const existingMembershipResult = await connection.query<{
        id: string;
        status: string;
      }>(
        `SELECT id, status FROM customer_business_memberships 
         WHERE customer_account_id = $1 AND business_id = $2
         LIMIT 1`,
        [customerAccountId, businessId],
      );

      if (existingMembershipResult.rows.length > 0) {
        const existing = existingMembershipResult.rows[0];
        membershipId = existing.id;

        if (existing.status === 'inactive') {
          // Reactivate membership
          await connection.query(
            `UPDATE customer_business_memberships 
             SET status = 'active', left_at = NULL, updated_at = now()
             WHERE id = $1`,
            [membershipId],
          );
          console.log(`[PublicJoin] Reactivated membership: ${membershipId.substring(0, 8)}...`);
        } else {
          // Already active
          console.log(`[PublicJoin] Existing active membership: ${membershipId.substring(0, 8)}...`);
        }
      } else {
        // Create new membership
        const createMembershipResult = await connection.query<{ id: string }>(
          `INSERT INTO customer_business_memberships 
             (customer_account_id, business_id, status, joined_at, created_at, updated_at)
           VALUES ($1, $2, 'active', now(), now(), now())
           RETURNING id`,
          [customerAccountId, businessId],
        );

        membershipId = createMembershipResult.rows[0].id;
        console.log(`[PublicJoin] Created new membership: ${membershipId.substring(0, 8)}...`);
      }

      // Step 4: Record membership lifecycle event
      await connection.query(
        `INSERT INTO membership_lifecycle_events 
           (membership_id, type, occurred_at)
         VALUES ($1, 'joined', now())`,
        [membershipId],
      );

      // Step 5: Issue personal QR credential
      let personalQrCredential: string | undefined;
      let personalQrShortCode: string | undefined;

      const existingQrResult = await connection.query<{ credentialHash: string }>(
        `SELECT credential_hash FROM customer_qr_credentials 
         WHERE customer_account_id = $1 AND revoked_at IS NULL
         LIMIT 1`,
        [customerAccountId],
      );

      if (existingQrResult.rows.length === 0) {
        const credentialId = crypto.randomUUID();
        const codes = deriveCustomerQrCodes(customerAccountId, credentialId);

        await connection.query(
          `INSERT INTO customer_qr_credentials 
             (id, customer_account_id, credential_hash, short_code_hash, issued_at)
           VALUES ($1, $2, $3, $4, now())`,
          [credentialId, customerAccountId, codes.credentialHash, codes.shortCodeHash],
        );

        personalQrCredential = codes.credential;
        personalQrShortCode = codes.shortCode;
        console.log(`[PublicJoin] Issued new QR credential`);
      } else {
        console.log(`[PublicJoin] Using existing QR credential`);
      }

      await connection.query('COMMIT');

      console.log(`[PublicJoin] Using session from phoneSignIn: ${sessionToken.substring(0, 8)}...`);

      // Step 6: Create and set session cookie using the same pattern as auth.handler.ts
      const auth = this.authService.getBetterAuth();
      const secret = auth.options.secret;

      const signedToken = await new SignJWT({ jti: sessionToken })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(sessionExpiresAt.getTime() / 1000))
        .sign(new TextEncoder().encode(secret));

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      };

      res.cookie('session_token', signedToken, cookieOptions);

      // Step 7: Return response
      const response: PublicJoinBusinessResponse = {
        customer: {
          id: userId,
          name: dto.name,
          phoneNumber: normalized,
          birthdate: dto.birthdate,
        },
        membership: {
          id: membershipId,
          businessId,
          businessName,
          status: 'active',
          joinedAt: new Date().toISOString(),
        },
        personalQrCredential,
        personalQrShortCode,
        session: {
          token: sessionToken,
          expiresAt: sessionExpiresAt.toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      if (connection) {
        try {
          await connection.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[PublicJoin] Rollback failed:', rollbackError);
        }
      }

      console.error('[PublicJoin] Join error:', error);

      if (error instanceof NotFoundException) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ConflictException) {
        res.status(409).json({ error: error.message });
      } else if (error instanceof BadRequestException) {
        res.status(400).json({ error: error.message });
      } else if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to join business' });
      }
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}
