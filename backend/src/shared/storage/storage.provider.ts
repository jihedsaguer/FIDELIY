/**
 * Storage provider interface for abstracted file storage.
 * Allows implementations to use local filesystem, S3, or other backends
 * without changing business logic.
 */

export interface StorageUploadOptions {
  /**
   * The file content as Buffer or stream
   */
  content: Buffer;
  /**
   * Original file MIME type
   */
  contentType: string;
  /**
   * Custom metadata to store with the file
   */
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  /**
   * Storage-specific key for retrieving the file
   */
  key: string;
  /**
   * Final MIME type (may differ from input if processed)
   */
  contentType: string;
  /**
   * File size in bytes
   */
  size: number;
}

export interface StorageRetrieveResult {
  content: Buffer;
  contentType: string;
  size: number;
}

/**
 * StorageProvider defines the contract for file storage backends.
 * Implementations must be idempotent and handle concurrent access safely.
 */
export abstract class StorageProvider {
  /**
   * Upload a file to storage.
   * Must be atomic: either fully succeed or fail without partial state.
   *
   * @param key Unique identifier for the file within the storage
   * @param options Upload configuration and content
   * @returns Metadata about the uploaded file
   * @throws If upload fails or key already exists
   */
  abstract upload(key: string, options: StorageUploadOptions): Promise<StorageUploadResult>;

  /**
   * Retrieve a file from storage.
   *
   * @param key The storage key
   * @returns File content and metadata
   * @throws If file not found or retrieval fails
   */
  abstract retrieve(key: string): Promise<StorageRetrieveResult>;

  /**
   * Delete a file from storage.
   * Must be idempotent: succeeds even if file doesn't exist.
   *
   * @param key The storage key
   * @throws Only if deletion fails due to non-idempotent reasons
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Check if a file exists in storage.
   *
   * @param key The storage key
   * @returns true if file exists, false otherwise
   */
  abstract exists(key: string): Promise<boolean>;
}
