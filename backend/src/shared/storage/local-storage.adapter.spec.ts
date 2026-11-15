import * as fs from 'fs/promises';
import * as path from 'path';
import { LocalStorageAdapter } from './local-storage.adapter';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory in process temp directory
    const baseTestDir = path.join(process.cwd(), '.test-storage');
    testDir = path.join(baseTestDir, 'storage-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    await fs.mkdir(testDir, { recursive: true });
    adapter = new LocalStorageAdapter(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('upload', () => {
    it('should upload a file', async () => {
      const content = Buffer.from('test image data');
      const key = 'test-image.png';

      const result = await adapter.upload(key, {
        content,
        contentType: 'image/png',
      });

      expect(result.key).toBe(key);
      expect(result.contentType).toBe('image/png');
      expect(result.size).toBe(content.length);

      // Verify file exists
      const savedContent = await fs.readFile(path.join(testDir, key));
      expect(savedContent).toEqual(content);
    });

    it('should reject if file already exists', async () => {
      const key = 'existing-file.png';
      const content = Buffer.from('test');

      // First upload succeeds
      await adapter.upload(key, { content, contentType: 'image/png' });

      // Second upload should fail
      await expect(
        adapter.upload(key, { content, contentType: 'image/png' }),
      ).rejects.toThrow('File already exists');
    });

    it('should reject invalid keys (path traversal)', async () => {
      const maliciousKey = '../../../etc/passwd';

      await expect(
        adapter.upload(maliciousKey, { content: Buffer.from(''), contentType: 'image/png' }),
      ).rejects.toThrow('path traversal');
    });

    it('should reject keys with slashes', async () => {
      const invalidKey = 'subdir/file.png';

      await expect(
        adapter.upload(invalidKey, { content: Buffer.from(''), contentType: 'image/png' }),
      ).rejects.toThrow('Invalid storage key');
    });
  });

  describe('retrieve', () => {
    it('should retrieve an uploaded file', async () => {
      const content = Buffer.from('test image data');
      const key = 'test-image.png';

      await adapter.upload(key, { content, contentType: 'image/png' });

      const result = await adapter.retrieve(key);

      expect(result.content).toEqual(content);
      expect(result.contentType).toBe('image/png');
      expect(result.size).toBe(content.length);
    });

    it('should throw if file not found', async () => {
      await expect(adapter.retrieve('nonexistent.png')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete an uploaded file', async () => {
      const key = 'test-image.png';

      await adapter.upload(key, { content: Buffer.from('test'), contentType: 'image/png' });
      await adapter.delete(key);

      // Verify file is gone
      const exists = await adapter.exists(key);
      expect(exists).toBe(false);
    });

    it('should be idempotent (succeeds even if file does not exist)', async () => {
      // Should not throw even for non-existent file
      await expect(adapter.delete('nonexistent.png')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const key = 'test-image.png';

      await adapter.upload(key, { content: Buffer.from('test'), contentType: 'image/png' });

      const exists = await adapter.exists(key);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const exists = await adapter.exists('nonexistent.png');
      expect(exists).toBe(false);
    });
  });
});
