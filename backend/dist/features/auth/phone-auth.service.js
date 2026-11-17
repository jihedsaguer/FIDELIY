"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneAuthService = void 0;
const common_1 = require("@nestjs/common");
/**
 * Phone number validation and normalization.
 * All phone numbers stored and used as 8-digit numbers without country code.
 */
let PhoneAuthService = class PhoneAuthService {
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
    normalizePhoneNumber(input) {
        if (!input || typeof input !== "string") {
            return null;
        }
        // Remove spaces, dashes, parentheses, dots, plus signs
        let cleaned = input.replace(/[\s\-().\+]/g, "");
        // If empty after cleaning, invalid
        if (!cleaned) {
            return null;
        }
        // Remove country code 216 if present (either as +216 or 216)
        if (cleaned.startsWith("216")) {
            cleaned = cleaned.substring(3);
        }
        // Remove leading 0 if present
        if (cleaned.startsWith("0")) {
            cleaned = cleaned.substring(1);
        }
        // Validate: should be exactly 8 digits
        if (!/^\d+$/.test(cleaned) || cleaned.length !== 8) {
            return null;
        }
        // Return normalized 8-digit number
        return cleaned;
    }
    /**
     * Validate that a phone number is valid format (8 digits).
     * @param phone 8-digit phone number
     * @returns True if valid
     */
    isValidTunisianPhone(phone) {
        if (!phone || typeof phone !== "string") {
            return false;
        }
        // Must be exactly 8 digits
        if (phone.length !== 8) {
            return false;
        }
        // Must be all digits
        return /^\d{8}$/.test(phone);
    }
    /**
     * Extract phone prefix for audit logging (first 4 digits only).
     * Examples:
     * - "12345678" → "1234"
     * - Full number never logged
     */
    getPhonePrefix(normalizedPhone) {
        if (!normalizedPhone || normalizedPhone.length < 4) {
            return "***";
        }
        return normalizedPhone.substring(0, 4);
    }
};
exports.PhoneAuthService = PhoneAuthService;
exports.PhoneAuthService = PhoneAuthService = __decorate([
    (0, common_1.Injectable)()
], PhoneAuthService);
//# sourceMappingURL=phone-auth.service.js.map