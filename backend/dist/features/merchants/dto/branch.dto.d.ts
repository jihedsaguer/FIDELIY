/**
 * DTO for creating a new branch
 */
export declare class CreateBranchDto {
    name: string;
    address?: string | null;
    phone?: string | null;
}
/**
 * DTO for updating an existing branch
 */
export declare class UpdateBranchDto {
    name?: string;
    address?: string | null;
    phone?: string | null;
}
/**
 * Response DTO for branch data
 */
export declare class BranchResponseDto {
    id: string;
    businessId: string;
    name: string;
    address: string | null;
    phone: string | null;
    qrCodeId: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Response DTO for branch list
 */
export declare class BranchListResponseDto {
    branches: BranchResponseDto[];
    total: number;
}
//# sourceMappingURL=branch.dto.d.ts.map