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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LocalStorageAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageAdapter = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const storage_provider_1 = require("./storage.provider");
/**
 * Local filesystem storage adapter.
 * Stores files in a Docker-mounted volume for persistent storage.
 *
 * **Security Notes:**
 * - All paths are validated against the base directory to prevent path traversal
 * - Keys are treated as untrusted input and sanitized
 * - File operations include error handling and logging
 */
let LocalStorageAdapter = LocalStorageAdapter_1 = class LocalStorageAdapter extends storage_provider_1.StorageProvider {
    /**
     * Initialize the local storage adapter.
     *
     * @param baseDir Base directory for storage (default: /data/logos)
     *                Must be a persistent Docker volume mount
     */
    constructor(baseDir = '/data/logos') {
        super();
        this.logger = new common_1.Logger(LocalStorageAdapter_1.name);
        this.baseDir = path.resolve(baseDir);
    }
    /**
     * Validate and normalize a storage key to prevent path traversal.
     *
     * @param key The storage key from application logic
     * @returns Absolute path to the file
     * @throws If key contains invalid characters or attempts path traversal
     */
    validateAndResolvePath(key) {
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
    async ensureDir() {
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
        }
        catch (error) {
            this.logger.error(`Failed to ensure storage directory: ${error}`);
            throw new Error(`Storage directory initialization failed: ${error.message}`);
        }
    }
    async upload(key, options) {
        try {
            await this.ensureDir();
            const filePath = this.validateAndResolvePath(key);
            // Check if file already exists (prevent overwrite)
            try {
                await fs.access(filePath);
                throw new Error(`File already exists at key: ${key}`);
            }
            catch (err) {
                // Expected: file should not exist
                if (err.code !== 'ENOENT')
                    throw err;
            }
            // Write file atomically using temporary file + rename
            const tempPath = `${filePath}.tmp`;
            try {
                await fs.writeFile(tempPath, options.content);
                await fs.rename(tempPath, filePath);
            }
            catch (err) {
                // Clean up temp file if rename failed
                try {
                    await fs.unlink(tempPath);
                }
                catch {
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
        }
        catch (error) {
            this.logger.error(`Upload failed for key ${key}: ${error}`);
            throw error;
        }
    }
    async retrieve(key) {
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
        }
        catch (error) {
            this.logger.error(`Retrieval failed for key ${key}: ${error}`);
            throw error;
        }
    }
    async delete(key) {
        try {
            const filePath = this.validateAndResolvePath(key);
            try {
                await fs.unlink(filePath);
                this.logger.debug(`Deleted file: ${key}`);
            }
            catch (err) {
                // Idempotent: succeed if file doesn't exist
                if (err.code === 'ENOENT') {
                    this.logger.debug(`File already deleted or not found: ${key}`);
                    return;
                }
                throw err;
            }
        }
        catch (error) {
            this.logger.error(`Deletion failed for key ${key}: ${error}`);
            throw error;
        }
    }
    async exists(key) {
        try {
            const filePath = this.validateAndResolvePath(key);
            await fs.access(filePath);
            return true;
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                return false;
            }
            this.logger.error(`Exists check failed for key ${key}: ${err}`);
            throw err;
        }
    }
    /**
     * Infer content type from file extension.
     */
    inferContentType(key) {
        const ext = path.extname(key).toLowerCase();
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
};
exports.LocalStorageAdapter = LocalStorageAdapter;
exports.LocalStorageAdapter = LocalStorageAdapter = LocalStorageAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String])
], LocalStorageAdapter);
//# sourceMappingURL=local-storage.adapter.js.map