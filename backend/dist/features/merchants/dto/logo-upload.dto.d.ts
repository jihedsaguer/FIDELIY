/**
 * DTOs for device-based logo upload endpoints.
 */
/**
 * Response from successful logo upload.
 */
export declare class LogoUploadResponseDto {
    /**
     * Storage key for the uploaded logo
     */
    storageKey: string;
    /**
     * Filename of the processed image
     */
    filename: string;
    /**
     * Final image width in pixels
     */
    width: number;
    /**
     * Final image height in pixels
     */
    height: number;
    /**
     * Final image MIME type
     */
    mimeType: string;
    /**
     * When the image was uploaded
     */
    uploadedAt: Date;
}
/**
 * Business setup response with logo metadata.
 * Extends existing business setup response with logo information.
 */
export interface BusinessWithLogoMetadata {
    logoStorageKey?: string | null;
    logoFilename?: string | null;
    logoWidth?: number | null;
    logoHeight?: number | null;
    logoMimeType?: string | null;
    logoUploadedAt?: Date | null;
}
//# sourceMappingURL=logo-upload.dto.d.ts.map