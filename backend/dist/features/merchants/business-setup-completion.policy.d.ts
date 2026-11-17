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
export declare function getMissingBusinessSetupFields(row: BusinessSetupCompletionData | undefined): string[];
//# sourceMappingURL=business-setup-completion.policy.d.ts.map