/**
 * Computes deterministic SHA-256 hex digest for customer QR credentials.
 * Used for constant-length hashed storage and secure hash-based lookup.
 */
export declare function hashCustomerQrCredential(credential: string): string;
/**
 * Constant-time comparison between a presented raw credential and a stored SHA-256 hash.
 */
export declare function verifyCustomerQrCredential(presentedCredential: string, storedHash: string): boolean;
//# sourceMappingURL=customer-qr.d.ts.map