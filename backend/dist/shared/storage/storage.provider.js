"use strict";
/**
 * Storage provider interface for abstracted file storage.
 * Allows implementations to use local filesystem, S3, or other backends
 * without changing business logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageProvider = void 0;
/**
 * StorageProvider defines the contract for file storage backends.
 * Implementations must be idempotent and handle concurrent access safely.
 */
class StorageProvider {
}
exports.StorageProvider = StorageProvider;
//# sourceMappingURL=storage.provider.js.map