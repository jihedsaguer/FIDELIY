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
export declare class LocalStorageAdapter extends StorageProvider {
    private readonly logger;
    private readonly baseDir;
    /**
     * Initialize the local storage adapter.
     *
     * @param baseDir Base directory for storage (default: /data/logos)
     *                Must be a persistent Docker volume mount
     */
    constructor(baseDir?: string);
    /**
     * Validate and normalize a storage key to prevent path traversal.
     *
     * @param key The storage key from application logic
     * @returns Absolute path to the file
     * @throws If key contains invalid characters or attempts path traversal
     */
    private validateAndResolvePath;
    /**
     * Ensure the base directory exists.
     */
    private ensureDir;
    upload(key: string, options: StorageUploadOptions): Promise<StorageUploadResult>;
    retrieve(key: string): Promise<StorageRetrieveResult>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    /**
     * Infer content type from file extension.
     */
    private inferContentType;
}
//# sourceMappingURL=local-storage.adapter.d.ts.map