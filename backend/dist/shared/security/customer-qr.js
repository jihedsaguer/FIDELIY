"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashCustomerQrCredential = hashCustomerQrCredential;
exports.verifyCustomerQrCredential = verifyCustomerQrCredential;
const node_crypto_1 = require("node:crypto");
/**
 * Computes deterministic SHA-256 hex digest for customer QR credentials.
 * Used for constant-length hashed storage and secure hash-based lookup.
 */
function hashCustomerQrCredential(credential) {
    return (0, node_crypto_1.createHash)('sha256').update(credential, 'utf8').digest('hex');
}
/**
 * Constant-time comparison between a presented raw credential and a stored SHA-256 hash.
 */
function verifyCustomerQrCredential(presentedCredential, storedHash) {
    const presentedHash = hashCustomerQrCredential(presentedCredential);
    const a = Buffer.from(presentedHash, 'utf8');
    const b = Buffer.from(storedHash, 'utf8');
    if (a.length !== b.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(a, b);
}
//# sourceMappingURL=customer-qr.js.map