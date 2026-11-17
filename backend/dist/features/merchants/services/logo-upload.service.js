"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var LogoUploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoUploadService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const sharp_1 = __importDefault(require("sharp"));
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
let LogoUploadService = LogoUploadService_1 = class LogoUploadService {
    constructor() {
        this.logger = new common_1.Logger(LogoUploadService_1.name);
        this.config = {
            maxFileSize: 5 * 1024 * 1024, // 5 MB
            maxDimensions: 4096,
            maxPixels: 16 * 1024 * 1024, // 16 megapixels
            targetMaxDimension: 2048,
            jpegQuality: 80,
            webpQuality: 80,
        };
        this.allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
        this.mimeToExtension = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp',
        };
    }
    /**
     * Validate and process an uploaded image file.
     *
     * @param fileBuffer Raw file content
     * @param originalMimeType Client-provided MIME type (not trusted)
     * @param businessId Business ID for filename generation
     * @returns Processed image ready for storage
     * @throws BadRequestException if validation or processing fails
     */
    async validateAndProcessImage(fileBuffer, originalMimeType, businessId) {
        try {
            // 1. Validate file size
            if (fileBuffer.length > this.config.maxFileSize) {
                throw new common_1.BadRequestException(`File size exceeds maximum allowed (${this.config.maxFileSize / 1024 / 1024} MB)`);
            }
            // 2. Validate and process with sharp (validates actual file content)
            let image = (0, sharp_1.default)(fileBuffer, {
                failOnError: true,
            });
            // Get metadata to validate dimensions
            const metadata = await image.metadata();
            if (!metadata.width || !metadata.height) {
                throw new common_1.BadRequestException('Unable to determine image dimensions');
            }
            // 3. Validate MIME type from actual image content
            const detectedMimeType = this.getMimeTypeFromFormat(metadata.format);
            if (!detectedMimeType) {
                throw new common_1.BadRequestException('Unsupported image format. Supported: PNG, JPEG, WebP');
            }
            // 4. Validate dimensions
            if (metadata.width > this.config.maxDimensions || metadata.height > this.config.maxDimensions) {
                throw new common_1.BadRequestException(`Image dimensions exceed maximum (${this.config.maxDimensions}×${this.config.maxDimensions})`);
            }
            // 5. Validate pixel count to prevent decompression attacks
            const pixelCount = metadata.width * metadata.height;
            if (pixelCount > this.config.maxPixels) {
                throw new common_1.BadRequestException(`Image pixel count exceeds maximum (${this.config.maxPixels / 1024 / 1024} megapixels)`);
            }
            // 6. Process: resize if needed, compress, strip metadata
            const { width, height } = metadata;
            let processedImage = image;
            // Resize if oversized, preserving aspect ratio
            if (width > this.config.targetMaxDimension || height > this.config.targetMaxDimension) {
                processedImage = processedImage.resize(this.config.targetMaxDimension, this.config.targetMaxDimension, {
                    fit: 'inside',
                    withoutEnlargement: true,
                });
            }
            // Compress and remove metadata
            let processedBuffer;
            let finalMimeType = detectedMimeType;
            let finalWidth = Math.min(width, this.config.targetMaxDimension);
            let finalHeight = Math.min(height, this.config.targetMaxDimension);
            // Calculate final dimensions after resize
            if (width > this.config.targetMaxDimension || height > this.config.targetMaxDimension) {
                const scale = Math.min(this.config.targetMaxDimension / width, this.config.targetMaxDimension / height);
                finalWidth = Math.round(width * scale);
                finalHeight = Math.round(height * scale);
            }
            if (detectedMimeType === 'image/png') {
                // Preserve PNG format (lossless)
                processedBuffer = await processedImage.png().toBuffer();
            }
            else if (detectedMimeType === 'image/jpeg') {
                processedBuffer = await processedImage
                    .jpeg({ quality: this.config.jpegQuality })
                    .toBuffer();
            }
            else if (detectedMimeType === 'image/webp') {
                processedBuffer = await processedImage
                    .webp({ quality: this.config.webpQuality })
                    .toBuffer();
            }
            else {
                throw new common_1.BadRequestException('Unsupported format after validation');
            }
            // 7. Generate safe filename
            const fileHash = crypto
                .createHash('sha256')
                .update(fileBuffer)
                .digest('hex')
                .slice(0, 16);
            const extension = this.mimeToExtension[finalMimeType];
            const filename = `${businessId}-${fileHash}.${extension}`;
            this.logger.debug(`Image processed: ${filename} (${finalWidth}×${finalHeight}, ${finalMimeType}, ${processedBuffer.length} bytes)`);
            return {
                buffer: processedBuffer,
                mimeType: finalMimeType,
                width: finalWidth,
                height: finalHeight,
                filename,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            // Log sharp or other processing errors
            this.logger.error(`Image processing failed: ${error}`);
            throw new common_1.BadRequestException(`Image processing failed: ${error.message}`);
        }
    }
    /**
     * Map sharp format to MIME type.
     * Only accepts formats we explicitly allow.
     */
    getMimeTypeFromFormat(format) {
        if (!format)
            return null;
        const formatMap = {
            png: 'image/png',
            jpeg: 'image/jpeg',
            jpg: 'image/jpeg',
            webp: 'image/webp',
        };
        return formatMap[format.toLowerCase()] || null;
    }
    /**
     * Generate a storage key for a logo file.
     * Key format: {businessId}-{hash}.{ext}
     */
    generateStorageKey(filename) {
        // Filename is already validated and safe
        return filename;
    }
};
exports.LogoUploadService = LogoUploadService;
exports.LogoUploadService = LogoUploadService = LogoUploadService_1 = __decorate([
    (0, common_1.Injectable)()
], LogoUploadService);
//# sourceMappingURL=logo-upload.service.js.map