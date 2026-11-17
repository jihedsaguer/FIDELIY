/**
 * Phone number validation and normalization.
 * All phone numbers stored and used as 8-digit numbers without country code.
 */
export declare class PhoneAuthService {
    /**
     * Normalize phone number to 8-digit format.
     * Accepts multiple formats and extracts the last 8 digits:
     * - "12345678" (8 digits)
     * - "21612345678" (with country code) → extracts "12345678"
     * - "+21612345678" (E.164) → extracts "12345678"
     * - "0212345678" → removes 0, extracts "21234567" → adds leading digit to make 8
     * - "+216 12 345 678" → extracts "12345678"
     *
     * @param input Raw phone input
     * @returns Normalized 8-digit phone or null if invalid
     */
    normalizePhoneNumber(input: string): string | null;
    /**
     * Validate that a phone number is valid format (8 digits).
     * @param phone 8-digit phone number
     * @returns True if valid
     */
    isValidTunisianPhone(phone: string): boolean;
    /**
     * Extract phone prefix for audit logging (first 4 digits only).
     * Examples:
     * - "12345678" → "1234"
     * - Full number never logged
     */
    getPhonePrefix(normalizedPhone: string): string;
}
//# sourceMappingURL=phone-auth.service.d.ts.map