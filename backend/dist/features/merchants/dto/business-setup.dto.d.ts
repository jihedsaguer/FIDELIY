export declare class BusinessThemeDto {
    primaryColor: string;
    accentColor: string;
}
export declare class CreateBusinessDto {
    name: string;
}
export declare class UpdateBusinessSetupDto {
    name?: string;
    description?: string | null;
    businessPhone?: string | null;
    phonePubliclyDisplayed?: boolean;
    logoUrl?: string | null;
    theme?: BusinessThemeDto | null;
}
export declare class CreateFirstBranchDto {
    name: string;
    address: string;
}
export declare class UpdateFirstBranchDto {
    name?: string;
    address?: string | null;
    phone?: string | null;
}
//# sourceMappingURL=business-setup.dto.d.ts.map