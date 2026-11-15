import { NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { BusinessAccessService } from '../../src/features/merchants/business-access.service';
import { BusinessSetupService } from '../../src/features/merchants/business-setup.service';
import { LogoUploadService } from '../../src/features/merchants/services/logo-upload.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';
import { StorageProvider } from '../../src/shared/storage/storage.provider';

describe('BusinessSetupService logo ownership', () => {
  const ownedBusinessId = 'business-a';
  const otherBusinessId = 'business-b';
  let query: jest.Mock;
  let retrieve: jest.Mock;
  let service: BusinessSetupService;

  beforeEach(() => {
    query = jest.fn(async (sql: string) => {
      if (sql.includes('FOR UPDATE OF b')) {
        return { rows: [{ id: ownedBusinessId }] };
      }
      if (sql.includes('logo_storage_key')) {
        return {
          rows: [{ logo_storage_key: 'logos/owned.png', logo_filename: 'owned.png' }],
        };
      }
      return { rows: [] };
    });
    retrieve = jest.fn(async () => ({
      content: Buffer.from('owned-logo'),
      contentType: 'image/png',
      size: 10,
    }));
    const connection = { query } as unknown as PoolClient;
    const tenantContext = {
      executeWithContext: jest.fn(
        async (_userId: string, operation: (client: PoolClient) => unknown) =>
          operation(connection),
      ),
    };
    service = new BusinessSetupService(
      tenantContext as unknown as TenantContextService,
      { retrieve } as unknown as StorageProvider,
      {} as LogoUploadService,
      new BusinessAccessService(),
    );
  });

  it('reads the logo for the locked business id', async () => {
    const logo = await service.getLogo(ownedBusinessId, 'merchant-a');

    expect(logo).toEqual({
      content: Buffer.from('owned-logo'),
      contentType: 'image/png',
      filename: 'owned.png',
    });
    const logoSelect = query.mock.calls.find(([sql]) =>
      String(sql).includes('logo_storage_key'),
    );
    expect(logoSelect?.[1]).toEqual([ownedBusinessId]);
    expect(retrieve).toHaveBeenCalledWith('logos/owned.png');
  });

  it('refuses another merchant logo id and does not retrieve that file', async () => {
    await expect(
      service.getLogo(otherBusinessId, 'merchant-a'),
    ).rejects.toThrow(new NotFoundException('Logo not found'));

    expect(
      query.mock.calls.some(([sql]) => String(sql).includes('logo_storage_key')),
    ).toBe(false);
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('keeps the business not-found message when the caller owns no business', async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(
      service.getLogo(ownedBusinessId, 'merchant-a'),
    ).rejects.toThrow(new NotFoundException('Business not found'));
    expect(retrieve).not.toHaveBeenCalled();
  });
});
