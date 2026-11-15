import type { PoolClient } from 'pg';
import { BusinessAccessService } from '../../src/features/merchants/business-access.service';
import { BusinessSetupService } from '../../src/features/merchants/business-setup.service';
import { LogoUploadService } from '../../src/features/merchants/services/logo-upload.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';
import { StorageProvider } from '../../src/shared/storage/storage.provider';

describe('BusinessSetupService logo replacement lifecycle', () => {
  const processed = {
    buffer: Buffer.from('processed'),
    filename: 'business-a-new.png',
    width: 100,
    height: 80,
    mimeType: 'image/png',
  };

  function createService(options: { commitFails?: boolean; updateFails?: boolean; deleteFails?: boolean } = {}) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FOR UPDATE OF b')) return { rows: [{ id: 'business-a' }] };
      if (sql.includes('SELECT logo_storage_key')) {
        return { rows: [{ logo_storage_key: 'business-a-old.png' }] };
      }
      if (sql.includes('UPDATE businesses') && options.updateFails) {
        throw new Error('database update failed');
      }
      return { rows: [] };
    });
    const connection = { query } as unknown as PoolClient;
    const tenantContext = {
      executeWithContext: jest.fn(async (_userId: string, operation: (client: PoolClient) => Promise<unknown>) => {
        const result = await operation(connection);
        if (options.commitFails) throw new Error('transaction commit failed');
        return result;
      }),
    };
    const storage = {
      upload: jest.fn(),
      delete: jest.fn(async (key: string) => {
        if (options.deleteFails && key === 'business-a-old.png') {
          throw new Error('storage cleanup failed');
        }
      }),
    };
    const processor = {
      validateAndProcessImage: jest.fn(async () => processed),
      generateStorageKey: jest.fn(() => 'business-a-new.png'),
    };
    return {
      service: new BusinessSetupService(
        tenantContext as unknown as TenantContextService,
        storage as unknown as StorageProvider,
        processor as unknown as LogoUploadService,
        new BusinessAccessService(),
      ),
      query,
      storage,
    };
  }

  it('deletes the previous file only after the transaction succeeds', async () => {
    const { service, query, storage } = createService();

    await service.uploadLogo('merchant-a', Buffer.from('image'), 'image/png');

    const updateCall = query.mock.invocationCallOrder.find((_, index) =>
      String(query.mock.calls[index][0]).includes('UPDATE businesses'),
    );
    expect(storage.delete).toHaveBeenCalledWith('business-a-old.png');
    expect(updateCall).toBeLessThan(storage.delete.mock.invocationCallOrder[0]);
  });

  it('keeps the prior logo and removes the new file when commit fails after the update', async () => {
    const { service, storage } = createService({ commitFails: true });

    await expect(service.uploadLogo('merchant-a', Buffer.from('image'), 'image/png')).rejects.toThrow(
      'transaction commit failed',
    );
    expect(storage.delete).toHaveBeenCalledWith('business-a-new.png');
    expect(storage.delete).not.toHaveBeenCalledWith('business-a-old.png');
  });

  it('removes the new file when the database update fails', async () => {
    const { service, storage } = createService({ updateFails: true });

    await expect(service.uploadLogo('merchant-a', Buffer.from('image'), 'image/png')).rejects.toThrow(
      'database update failed',
    );
    expect(storage.delete).toHaveBeenCalledWith('business-a-new.png');
    expect(storage.delete).not.toHaveBeenCalledWith('business-a-old.png');
  });

  it('does not fail a completed upload when old-file cleanup fails', async () => {
    const { service, storage } = createService({ deleteFails: true });

    await expect(service.uploadLogo('merchant-a', Buffer.from('image'), 'image/png')).resolves.toMatchObject({
      storageKey: 'business-a-new.png',
    });
    expect(storage.delete).toHaveBeenCalledWith('business-a-old.png');
  });
});
