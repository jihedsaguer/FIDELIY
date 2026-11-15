import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import sharp from 'sharp';

/**
 * Logo upload configuration and limits.
 */
export interface LogoUploadConfig {
  maxFileSize: number; // bytes
  maxDimensions: number; // max width or height
  maxPixels: number; // max total decoded pixels to prevent decompression attacks
  targetMaxDimension: number; // target dimension for resizing oversized images
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
@Injectable()
export class LogoUploadService {
  private readonly logger = new Logger(LogoUploadService.name);

  private readonly config: LogoUploadConfig = {
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    maxDimensions: 4096,
    maxPixels: 16 * 1024 * 1024, // 16 megapixels
    targetMaxDimension: 2048,
    jpegQuality: 80,
    webpQuality: 80,
  };

  private readonly allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
  private readonly mimeToExtension: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };

  /**
   * Validate and process an uploaded image file.
   *
   * @param fileBuffer Raw file content
   * @param originalMimeType Client-provided MIME type (not trusted)
   * @param businessId Business ID for filename generation
   * @returns Processed image ready for storage
   * @throws BadRequestException if validation or processing fails
   */
  async validateAndProcessImage(
    fileBuffer: Buffer,
    originalMimeType: string,
    businessId: string,
  ): Promise<ProcessedImage> {
    try {
      // 1. Validate file size
      if (fileBuffer.length > this.config.maxFileSize) {
        throw new BadRequestException(
          `File size exceeds maximum allowed (${this.config.maxFileSize / 1024 / 1024} MB)`,
        );
      }

      // 2. Validate and process with sharp (validates actual file content)
      let image = sharp(fileBuffer, {
        failOnError: true,
      });

      // Get metadata to validate dimensions
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Unable to determine image dimensions');
      }

      // 3. Validate MIME type from actual image content
      const detectedMimeType = this.getMimeTypeFromFormat(metadata.format);
      if (!detectedMimeType) {
        throw new BadRequestException(
          'Unsupported image format. Supported: PNG, JPEG, WebP',
        );
      }

      // 4. Validate dimensions
      if (metadata.width > this.config.maxDimensions || metadata.height > this.config.maxDimensions) {
        throw new BadRequestException(
          `Image dimensions exceed maximum (${this.config.maxDimensions}×${this.config.maxDimensions})`,
        );
      }

      // 5. Validate pixel count to prevent decompression attacks
      const pixelCount = metadata.width * metadata.height;
      if (pixelCount > this.config.maxPixels) {
        throw new BadRequestException(
          `Image pixel count exceeds maximum (${this.config.maxPixels / 1024 / 1024} megapixels)`,
        );
      }

      // 6. Process: resize if needed, compress, strip metadata
      const { width, height } = metadata;
      let processedImage = image;

      // Resize if oversized, preserving aspect ratio
      if (width > this.config.targetMaxDimension || height > this.config.targetMaxDimension) {
        processedImage = processedImage.resize(
          this.config.targetMaxDimension,
          this.config.targetMaxDimension,
          {
            fit: 'inside',
            withoutEnlargement: true,
          },
        );
      }

      // Compress and remove metadata
      let processedBuffer: Buffer;
      let finalMimeType = detectedMimeType;
      let finalWidth = Math.min(width, this.config.targetMaxDimension);
      let finalHeight = Math.min(height, this.config.targetMaxDimension);

      // Calculate final dimensions after resize
      if (width > this.config.targetMaxDimension || height > this.config.targetMaxDimension) {
        const scale = Math.min(
          this.config.targetMaxDimension / width,
          this.config.targetMaxDimension / height,
        );
        finalWidth = Math.round(width * scale);
        finalHeight = Math.round(height * scale);
      }

      if (detectedMimeType === 'image/png') {
        // Preserve PNG format (lossless)
        processedBuffer = await processedImage.png().toBuffer();
      } else if (detectedMimeType === 'image/jpeg') {
        processedBuffer = await processedImage
          .jpeg({ quality: this.config.jpegQuality })
          .toBuffer();
      } else if (detectedMimeType === 'image/webp') {
        processedBuffer = await processedImage
          .webp({ quality: this.config.webpQuality })
          .toBuffer();
      } else {
        throw new BadRequestException('Unsupported format after validation');
      }

      // 7. Generate safe filename
      const fileHash = crypto
        .createHash('sha256')
        .update(fileBuffer)
        .digest('hex')
        .slice(0, 16);
      const extension = this.mimeToExtension[finalMimeType];
      const filename = `${businessId}-${fileHash}.${extension}`;

      this.logger.debug(
        `Image processed: ${filename} (${finalWidth}×${finalHeight}, ${finalMimeType}, ${processedBuffer.length} bytes)`,
      );

      return {
        buffer: processedBuffer,
        mimeType: finalMimeType,
        width: finalWidth,
        height: finalHeight,
        filename,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Log sharp or other processing errors
      this.logger.error(`Image processing failed: ${error}`);
      throw new BadRequestException(`Image processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Map sharp format to MIME type.
   * Only accepts formats we explicitly allow.
   */
  private getMimeTypeFromFormat(format: string | undefined): string | null {
    if (!format) return null;

    const formatMap: Record<string, string> = {
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
  generateStorageKey(filename: string): string {
    // Filename is already validated and safe
    return filename;
  }
}
