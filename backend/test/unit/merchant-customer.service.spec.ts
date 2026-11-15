import { ConflictException, NotFoundException } from '@nestjs/common';

import type { PoolClient } from 'pg';
import { BusinessAccessService } from '../../src/features/merchants/business-access.service';
import { MerchantCustomerService } from '../../src/features/merchants/merchant-customer.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';
import { hashCustomerQrCredential } from '../../src/shared/security/customer-qr';

describe('MerchantCustomerService - QR Resolution', () => {
  let service: MerchantCustomerService;
  let query: jest.Mock;
  let connection: { query: jest.Mock };
  let tenantContext: { executeWithContext: jest.Mock };

  beforeEach(() => {
    query = jest.fn();
    connection = { query };
    tenantContext = {
      executeWithContext: jest.fn(
        async (_userId: string, operation: (client: PoolClient) => unknown) =>
          operation(connection as unknown as PoolClient),
      ),
    };
    service = new MerchantCustomerService(
      tenantContext as unknown as TenantContextService,
      new BusinessAccessService(),
    );
  });

  const rawCredential = 'a'.repeat(43);
  const expectedHash = hashCustomerQrCredential(rawCredential);

  it('resolves an active customer membership through valid QR credential hash', async () => {
    const joinedAt = new Date('2026-01-15T10:00:00Z');
    query.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM businesses b')) {
        return { rows: [{ id: 'business-uuid-1' }] };
      }
      if (sql.includes('FROM customer_qr_credentials qr')) {
        expect(params[0]).toBe(expectedHash);
        expect(params[1]).toBe('business-uuid-1');
        return {
          rows: [
            {
              customerName: 'Samir Ben Ali',
              membershipStatus: 'active',
              joinedAt,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const result = await service.resolveCustomerQr('merchant-user-1', rawCredential);

    expect(result).toEqual({
      customer: { name: 'Samir Ben Ali' },
      membership: {
        status: 'active',
        joinedAt,
      },
    });
    // Ensure raw credential or hash is never in response
    expect((result as any).credential).toBeUndefined();
    expect((result as any).credentialHash).toBeUndefined();
  });

  it('rejects credential when not found or revoked', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM businesses b')) {
        return { rows: [{ id: 'business-uuid-1' }] };
      }
      if (sql.includes('FROM customer_qr_credentials qr')) {
        return { rows: [] }; // Not found or revoked
      }
      return { rows: [] };
    });

    await expect(
      service.resolveCustomerQr('merchant-user-1', rawCredential),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects with ConflictException when customer has not joined the business or membership is inactive', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM businesses b')) {
        return { rows: [{ id: 'business-uuid-1' }] };
      }
      if (sql.includes('FROM customer_qr_credentials qr')) {
        return {
          rows: [
            {
              customerName: 'Samir Ben Ali',
              membershipStatus: null, // Not a member
              joinedAt: null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    await expect(
      service.resolveCustomerQr('merchant-user-1', rawCredential),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects when merchant owns no business', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM businesses b')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    await expect(
      service.resolveCustomerQr('merchant-user-1', rawCredential),
    ).rejects.toThrow('Business not found for this merchant');
  });
});

