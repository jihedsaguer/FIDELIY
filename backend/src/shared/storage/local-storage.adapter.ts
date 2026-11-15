import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageProvider, StorageUploadOptions, StorageUploadResult, StorageRetrieveResult } from './storage.provider';

/**
 * Local filesystem storage adapter.
 * Stores files in a Docker-mounted volume for persistent storage.
 *
 * **Security Notes:**
 * - All paths are validated against the base directory to prevent path traversal
 * - Keys are treated as untrusted input and sanitized
 * - File operations include error handling and logging
 */
@Injectable()
export class LocalStorageAdapter extends StorageProvider {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly baseDir: string;

  /**
   * Initialize the local storage adapter.
   *
   * @param baseDir Base directory for storage (default: /data/logos)
   *                Must be a persistent Docker volume mount
   */
  constructor(baseDir: string = '/data/logos') {
    super();
    this.baseDir = path.resolve(baseDir);
  }

  /**
   * Validate and normalize a storage key to prevent path traversal.
   *
   * @param key The storage key from application logic
   * @returns Absolute path to the file
   * @throws If key contains invalid characters or attempts path traversal
   */
  private validateAndResolvePath(key: string): string {
    // Reject empty or suspicious keys
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid storage key: empty or not a string');
    }

    // Reject keys with path traversal attempts
    if (key.includes('..') || key.includes('/') || key.includes('\\')) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    // Allow only alphanumeric, dash, and dot (for file extensions)
    if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
      throw new Error('Invalid storage key: contains invalid characters');
    }

    const fullPath = path.join(this.baseDir, key);

    // Double-check that resolved path is within baseDir
    if (!fullPath.startsWith(this.baseDir + path.sep) && fullPath !== this.baseDir) {
      throw new Error('Invalid storage key: path outside base directory');
    }

    return fullPath;
  }

  /**
   * Ensure the base directory exists.
   */
  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to ensure storage directory: ${error}`);
      throw new Error(`Storage directory initialization failed: ${(error as Error).message}`);
    }
  }

  async upload(key: string, options: StorageUploadOptions): Promise<StorageUploadResult> {
    try {
      await this.ensureDir();

      const filePath = this.validateAndResolvePath(key);

      // Check if file already exists (prevent overwrite)
      try {
        await fs.access(filePath);
        throw new Error(`File already exists at key: ${key}`);
      } catch (err) {
        // Expected: file should not exist
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }

      // Write file atomically using temporary file + rename
      const tempPath = `${filePath}.tmp`;

      try {
        await fs.writeFile(tempPath, options.content);
        await fs.rename(tempPath, filePath);
      } catch (err) {
        // Clean up temp file if rename failed
        try {
          await fs.unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
        throw err;
      }

      const stats = await fs.stat(filePath);

      this.logger.debug(`Uploaded file: ${key} (${stats.size} bytes, ${options.contentType})`);

      return {
        key,
        contentType: options.contentType,
        size: stats.size,
      };
    } catch (error) {
      this.logger.error(`Upload failed for key ${key}: ${error}`);
      throw error;
    }
  }

  async retrieve(key: string): Promise<StorageRetrieveResult> {
    try {
      const filePath = this.validateAndResolvePath(key);

      const content = await fs.readFile(filePath);
      const stats = await fs.stat(filePath);

      // Return content type from metadata or infer from key
      const contentType = this.inferContentType(key);

      this.logger.debug(`Retrieved file: ${key} (${stats.size} bytes)`);

      return {
        content,
        contentType,
        size: stats.size,
      };
    } catch (error) {
      this.logger.error(`Retrieval failed for key ${key}: ${error}`);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.validateAndResolvePath(key);

      try {
        await fs.unlink(filePath);
        this.logger.debug(`Deleted file: ${key}`);
      } catch (err) {
        // Idempotent: succeed if file doesn't exist
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          this.logger.debug(`File already deleted or not found: ${key}`);
          return;
        }
        throw err;
      }
    } catch (error) {
      this.logger.error(`Deletion failed for key ${key}: ${error}`);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = this.validateAndResolvePath(key);
      await fs.access(filePath);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      this.logger.error(`Exists check failed for key ${key}: ${err}`);
      throw err;
    }
  }

  /**
   * Infer content type from file extension.
   */
  private inferContentType(key: string): string {
    const ext = path.extname(key).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
