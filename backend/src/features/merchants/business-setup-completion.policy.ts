export interface BusinessSetupCompletionData {
  name: string;
  business_phone: string | null;
  phone_visibility_configured: boolean;
  logo_url: string | null;
  logo_storage_key: string | null;
  theme_primary_color: string | null;
  theme_accent_color: string | null;
  branch_name: string | null;
  branch_address: string | null;
}

/**
 * Returns setup fields that still prevent onboarding completion, in API order.
 */
export function getMissingBusinessSetupFields(
  row: BusinessSetupCompletionData | undefined,
): string[] {
  if (!row) return ['business'];

  const missing: string[] = [];
  if (!row.name.trim()) missing.push('business.name');
  if (!row.business_phone?.trim()) missing.push('business.businessPhone');
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
  if (!row.branch_name?.trim()) missing.push('firstBranch.name');
  if (!row.branch_address?.trim()) missing.push('firstBranch.address');
  return missing;
}
