import { BadRequestException } from '@nestjs/common';
import { LogoUploadService } from './logo-upload.service';
import sharp from 'sharp';

describe('LogoUploadService', () => {
  let service: LogoUploadService;
  beforeEach(() => {
    service = new LogoUploadService();
  });

  describe('validateAndProcessImage', () => {
    it('should process a valid PNG image', async () => {
      // Create a valid minimal PNG using sharp
      const pngBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer();

      const result = await service.validateAndProcessImage(pngBuffer, 'image/png', 'test-business');

      expect(result.mimeType).toBe('image/png');
      expect(result.width).toBeLessThanOrEqual(100);
      expect(result.height).toBeLessThanOrEqual(100);
      expect(result.filename).toMatch(/^test-business-[a-f0-9]{16}\.png$/);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('should process a valid JPEG image', async () => {
      const jpegBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg({ quality: 80 })
        .toBuffer();

      const result = await service.validateAndProcessImage(jpegBuffer, 'image/jpeg', 'test-business');

      expect(result.mimeType).toBe('image/jpeg');
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.filename).toMatch(/^test-business-[a-f0-9]{16}\.jpg$/);
    });

    it('should process a valid WebP image', async () => {
      const webpBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 },
        },
      })
        .webp({ quality: 80 })
        .toBuffer();

      const result = await service.validateAndProcessImage(webpBuffer, 'image/webp', 'test-business');

      expect(result.mimeType).toBe('image/webp');
      expect(result.filename).toMatch(/^test-business-[a-f0-9]{16}\.webp$/);
    });

    it('should resize oversized images', async () => {
      // Create image larger than target (2048x2048)
      const largeBuffer = await sharp({
        create: {
          width: 4096,
          height: 4096,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await service.validateAndProcessImage(largeBuffer, 'image/jpeg', 'test-business');

      // Should be resized to at most 2048x2048
      expect(result.width).toBeLessThanOrEqual(2048);
      expect(result.height).toBeLessThanOrEqual(2048);
    });

    it('should reject file larger than 5MB', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

      await expect(
        service.validateAndProcessImage(largeBuffer, 'image/png', 'test-business'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unsupported MIME types', async () => {
      const gifBuffer = Buffer.from('GIF89a', 'utf-8');

      await expect(
        service.validateAndProcessImage(gifBuffer, 'image/gif', 'test-business'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject corrupted image data', async () => {
      const corruptedBuffer = Buffer.from('not an image at all');

      await expect(
        service.validateAndProcessImage(corruptedBuffer, 'image/png', 'test-business'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate unique filenames with SHA256 hash', async () => {
      const pngBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const result1 = await service.validateAndProcessImage(pngBuffer, 'image/png', 'bus1');
      const result2 = await service.validateAndProcessImage(pngBuffer, 'image/png', 'bus2');

      expect(result1.filename).toContain('bus1-');
      expect(result2.filename).toContain('bus2-');
      // Same file with different business ID should have different filenames
      expect(result1.filename).not.toEqual(result2.filename);
    });

    it('should reject images exceeding pixel limit', async () => {
      // Create an image that exceeds pixel limit (16MP)
      const hugeBuffer = await sharp({
        create: {
          width: 5000,
          height: 5000,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      await expect(
        service.validateAndProcessImage(hugeBuffer, 'image/jpeg', 'test-business'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject images exceeding max dimensions', async () => {
      // Create image larger than max allowed (4096x4096)
      const oversizeBuffer = await sharp({
        create: {
          width: 5000,
          height: 5000,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      await expect(
        service.validateAndProcessImage(oversizeBuffer, 'image/jpeg', 'test-business'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateStorageKey', () => {
    it('should return the filename as storage key', () => {
      const filename = 'business-abc123.png';
      const key = service.generateStorageKey(filename);

      expect(key).toBe(filename);
    });
  });
});
