/**
 * DTO for merchant-assisted customer registration.
 * Used when a merchant scans a customer QR that doesn't resolve to a customer,
 * and needs to register the customer on their behalf.
 */
export declare class RegisterCustomerDto {
    /**
     * Customer's full name.
     * Required for customer identification.
     */
    name: string;
    /**
     * Customer's phone number in Tunisian format (8 digits).
     * Required for customer identification and uniqueness.
     * Must be unique across all customer accounts.
     */
    phoneNumber: string;
    /**
     * Customer's date of birth in YYYY-MM-DD format.
     * Optional - only if supported by existing schema.
     */
    birthdate?: string;
}
/**
 * Response DTO for successful merchant-assisted customer registration.
 * Returns customer information, membership, and personal QR credential.
 * Does NOT include a session token (merchant's session remains unaffected).
 *
 * Security: personalQrCredential is returned only for NEW customers (first registration).
 * The raw credential is returned once so the merchant can display the QR code to the customer.
 * Only the SHA-256 hash is stored in the database. For existing customers, personalQrCredential
 * is undefined since the raw credential cannot be retrieved from the hash.
 */
export interface RegisterCustomerResponse {
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
        status: 'active';
        joinedAt: string;
    };
    personalQrCredential: string | undefined;
}
//# sourceMappingURL=register-customer.dto.d.ts.map