import type { Request, Response } from 'express';
import { DatabaseService } from '../../database/database.service';
import { AuthService } from '../auth/auth.service';
import { PhoneAuthService } from '../auth/phone-auth.service';
import { PublicJoinBusinessDto, PublicCustomerLookupDto, PublicBusinessDiscoveryResponse, PublicCustomerLookupResponse } from './dto/public-customer.dto';
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
export declare class PublicCustomerController {
    private readonly databaseService;
    private readonly authService;
    private readonly phoneAuthService;
    constructor(databaseService: DatabaseService, authService: AuthService, phoneAuthService: PhoneAuthService);
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
    discoverBusiness(qrId: string): Promise<PublicBusinessDiscoveryResponse>;
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
    lookupCustomer(dto: PublicCustomerLookupDto): Promise<PublicCustomerLookupResponse>;
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
    joinBusiness(dto: PublicJoinBusinessDto, res: Response, req: Request): Promise<void>;
}
//# sourceMappingURL=public-customer.controller.d.ts.map