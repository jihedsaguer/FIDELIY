"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMissingBusinessSetupFields = getMissingBusinessSetupFields;
/**
 * Returns setup fields that still prevent onboarding completion, in API order.
 */
function getMissingBusinessSetupFields(row) {
    if (!row)
        return ['business'];
    const missing = [];
    if (!row.name.trim())
        missing.push('business.name');
    if (!row.business_phone?.trim())
        missing.push('business.businessPhone');
    if (!row.phone_visibility_configured) {
        missing.push('business.phonePubliclyDisplayed');
    }
    if (!row.logo_url?.trim() && !row.logo_storage_key) {
        missing.push('business.logo');
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(row.theme_primary_color ?? '')) {
        missing.push('business.theme.primaryColor');
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(row.theme_accent_color ?? '')) {
        missing.push('business.theme.accentColor');
    }
    if (!row.branch_name?.trim())
        missing.push('firstBranch.name');
    if (!row.branch_address?.trim())
        missing.push('firstBranch.address');
    return missing;
}
//# sourceMappingURL=business-setup-completion.policy.js.map