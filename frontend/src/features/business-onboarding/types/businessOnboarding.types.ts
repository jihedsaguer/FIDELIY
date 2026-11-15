export type BusinessSetupStatus = 'required' | 'in_progress' | 'complete';

export interface BusinessSetup {
  status: BusinessSetupStatus;
  business: {
    id: string;
    name: string;
    description: string | null;
    branchCount: number;
    businessPhone: string | null;
    phonePubliclyDisplayed: boolean;
    phoneVisibilityConfigured: boolean;
    logoUrl: string | null;
    theme: {
      primaryColor: string | null;
      accentColor: string | null;
    } | null;
    onboardingCompleted: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  branches: Branch[];
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address: string | null;
  phone: string | null;
  qrCodeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBusinessSetupInput {
  name?: string;
  businessPhone?: string;
  phonePubliclyDisplayed?: boolean;
  logoUrl?: string;
  theme?: { primaryColor: string; accentColor: string };
}

export interface UpdateFirstBranchInput {
  name?: string;
  address?: string;
}

export interface OnboardingFields {
  businessName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  businessPhone: string;
  phonePubliclyDisplayed: boolean | null;
  branchName: string;
  branchAddress: string;
}
