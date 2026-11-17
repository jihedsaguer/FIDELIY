import { IsString, IsDateString, IsOptional, Length, IsUUID, IsNotEmpty } from 'class-validator';

/**
 * DTO for joining a business via public QR code.
 * Used by unauthenticated customers during onboarding.
 */
export class PublicJoinBusinessDto {
  /**
   * The business public QR identifier or branch QR identifier.
   * Must be a valid UUID.
   */
  @IsUUID()
  @IsNotEmpty()
  qrId!: string;

  /**
   * Optional branch QR identifier for branch-specific onboarding.
   */
  @IsOptional()
  @IsUUID()
  branchQrId?: string;

  /**
   * Customer's full name.
   * Required for new customer creation.
   */
  @IsString()
  @Length(1, 255)
  @IsNotEmpty()
  name!: string;

  /**
   * Customer's birthdate in YYYY-MM-DD format.
   * Optional for onboarding.
   */
  @IsOptional()
  @IsDateString()
  birthdate?: string;

  /**
   * Customer's phone number in Tunisian format (8 digits).
   * Required for customer identification and OTP.
   */
  @IsString()
  @Length(8, 8)
  @IsNotEmpty()
  phoneNumber!: string;
}

/**
 * DTO for looking up an existing customer by phone number.
 * Used to find existing customer account without creating duplicates.
 */
export class PublicCustomerLookupDto {
  /**
   * Customer's phone number in Tunisian format (8 digits).
   */
  @IsString()
  @Length(8, 8)
  @IsNotEmpty()
  phoneNumber!: string;
}

/**
 * Response DTO for business discovery via QR code.
 * Contains public business information for onboarding display.
 */
export interface PublicBusinessDiscoveryResponse {
  business: {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    theme: {
      primaryColor: string | null;
      accentColor: string | null;
    };
    branchCount: number;
  };
  program: {
    type: 'stamps' | 'points' | 'both';
    version: number;
    name?: string;
    description?: string;
  } | null;
  branch?: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
  };
}

/**
 * Response DTO for customer lookup.
 * Returns existing customer information if found.
 */
export interface PublicCustomerLookupResponse {
  exists: boolean;
  customer?: {
    id: string;
    name: string;
    phoneNumber: string;
    birthdate?: string;
    hasMembership: boolean;
    memberships: Array<{
      businessId: string;
      businessName: string;
      status: 'active' | 'inactive';
    }>;
  };
}

/**
 * Response DTO for successful customer join.
 * Contains customer information and personal QR credential.
 */
export interface PublicJoinBusinessResponse {
  customer: {
    id: string;
    name: string;
    phoneNumber: string;
    birthdate?: string;
  };
  membership: {
    id: string;
    businessId: string;
    businessName: string;
    status: 'active' | 'inactive';
    joinedAt: string;
  };
  personalQrCredential?: string;
  session: {
    token: string;
    expiresAt: string;
  };
}

/**
 * DTO for resolving business QR code.
 * Used by both public and merchant flows.
 */
export class ResolveBusinessQrDto {
  @IsUUID()
  @IsNotEmpty()
  qrId!: string;
}
