/**
 * Logo upload configuration and limits.
 */
export interface LogoUploadConfig {
    maxFileSize: number;
    maxDimensions: number;
    maxPixels: number;
    targetMaxDimension: number;
    jpegQuality: number;
    webpQuality: number;
}
/**
 * Result of successful image processing.
 */
export interface ProcessedImage {
    buffer: Buffer;
    mimeType: string;
    width: number;
    height: number;
    filename: string;
}
/**
 * LogoUploadService validates and processes logo image content.
 *
 * **Security Measures:**
 * - Validate file size before processing
 * - Validate actual image content and dimensions
 * - Enforce pixel limits to prevent decompression attacks
 * - Strip all metadata during processing
 * - Generate cryptographic filenames to prevent collisions
 */
export declare class LogoUploadService {
    private readonly logger;
    private readonly config;
    private readonly allowedMimeTypes;
    private readonly mimeToExtension;
    /**
     * Validate and process an uploaded image file.
     *
     * @param fileBuffer Raw file content
     * @param originalMimeType Client-provided MIME type (not trusted)
     * @param businessId Business ID for filename generation
     * @returns Processed image ready for storage
     * @throws BadRequestException if validation or processing fails
     */
    validateAndProcessImage(fileBuffer: Buffer, originalMimeType: string, businessId: string): Promise<ProcessedImage>;
    /**
     * Map sharp format to MIME type.
     * Only accepts formats we explicitly allow.
     */
    private getMimeTypeFromFormat;
    /**
     * Generate a storage key for a logo file.
     * Key format: {businessId}-{hash}.{ext}
     */
    generateStorageKey(filename: string): string;
}
//# sourceMappingURL=logo-upload.service.d.ts.map