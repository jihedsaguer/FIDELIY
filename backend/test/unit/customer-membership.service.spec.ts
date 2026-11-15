import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { CustomerMembershipService } from '../../src/features/customers/customer-membership.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';

describe('CustomerMembershipService', () => {
  let service: CustomerMembershipService;
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
    service = new CustomerMembershipService(
      tenantContext as unknown as TenantContextService,
    );
  });

  it('creates business-level membership through a branch QR', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM branches br') && sql.includes('JOIN businesses')) {
        return { rows: [{ id: 'business-1' }] };
      }
      if (sql.includes('FROM programs')) return { rows: [{ id: 'program-1' }] };
      if (sql.includes('INSERT INTO customer_business_memberships')) {
        return { rows: [{ id: 'membership-1' }] };
      }
      if (sql.includes('FROM customer_business_memberships m')) {
        return {
          rows: [{
            id: 'membership-1',
            status: 'active',
            joinedAt: new Date('2026-01-01T00:00:00Z'),
            leftAt: null,
            businessName: 'Business',
            logoUrl: null,
            programType: 'stamps',
            programVersion: 1,
          }],
        };
      }
      return { rows: [] };
    });

    const membership = await service.joinBusiness('user-1', {
      branchQrId: 'legacy-opaque-branch-key',
    });

    expect(membership).toMatchObject({
      status: 'active',
      business: { name: 'Business' },
      program: { type: 'stamps', version: 1 },
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE br.qr_code_id = $1'),
      ['legacy-opaque-branch-key'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO membership_lifecycle_events'),
      ['membership-1', 'joined'],
    );
  });

  it('uses the existing active membership on repeated joins without duplicating history', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM businesses b') && sql.includes('public_qr_id')) {
        return { rows: [{ id: 'business-1' }] };
      }
      if (sql.includes('FROM programs')) return { rows: [{ id: 'program-1' }] };
      if (sql.includes('INSERT INTO customer_business_memberships')) {
        return { rows: [] };
      }
      if (sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'membership-1', status: 'active' }] };
      }
      if (sql.includes('FROM customer_business_memberships m')) {
        return {
          rows: [{
            id: 'membership-1',
            status: 'active',
            joinedAt: new Date('2026-01-01T00:00:00Z'),
            leftAt: null,
            businessName: 'Business',
            logoUrl: null,
            programType: 'points',
            programVersion: 2,
          }],
        };
      }
      return { rows: [] };
    });

    await service.joinBusiness('user-1', { businessQrId: 'public-qr-1' });

    expect(query.mock.calls.filter(([sql]) =>
      (sql as string).includes('INSERT INTO customer_business_memberships'),
    )).toHaveLength(1);
    expect(query.mock.calls.some(([sql]) =>
      (sql as string).includes('INSERT INTO membership_lifecycle_events'),
    )).toBe(false);
    expect(query.mock.calls.some(([sql]) =>
      (sql as string).includes('DELETE'),
    )).toBe(false);
  });

  it('reactivates an inactive membership and preserves it as the same record', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM businesses b') && sql.includes('public_qr_id')) {
        return { rows: [{ id: 'business-1' }] };
      }
      if (sql.includes('FROM programs')) return { rows: [{ id: 'program-1' }] };
      if (sql.includes('INSERT INTO customer_business_memberships')) {
        return { rows: [] };
      }
      if (sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'membership-1', status: 'inactive' }] };
      }
      if (sql.includes('FROM customer_business_memberships m')) {
        return {
          rows: [{
            id: 'membership-1',
            status: 'active',
            joinedAt: new Date('2026-01-01T00:00:00Z'),
            leftAt: null,
            businessName: 'Business',
            logoUrl: null,
            programType: 'both',
            programVersion: 3,
          }],
        };
      }
      return { rows: [] };
    });

    await service.joinBusiness('user-1', { businessQrId: 'public-qr-1' });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'active', left_at = NULL"),
      ['membership-1'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO membership_lifecycle_events'),
      ['membership-1', 'joined'],
    );
  });

  it('rejects joining when the business has no active programme', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM businesses b') && sql.includes('public_qr_id')) {
        return { rows: [{ id: 'business-1' }] };
      }
      return { rows: [] };
    });

    await expect(
      service.joinBusiness('user-1', { businessQrId: 'public-qr-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(query.mock.calls.some(([sql]) =>
      (sql as string).includes('INSERT INTO customer_business_memberships'),
    )).toBe(false);
  });

  it('rejects a branch QR that does not belong to the resolved business', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM businesses b') && sql.includes('public_qr_id')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    await expect(
      service.joinBusiness('user-1', {
        businessQrId: 'public-qr-1',
        branchQrId: 'branch-from-another-business',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes membership listing and retrieval to the authenticated customer', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM customer_business_memberships m')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    expect(await service.listMemberships('user-1')).toEqual([]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE m.customer_account_id = $1'),
      ['customer-account-1'],
    );

    await expect(
      service.getMembership('user-1', 'another-customers-membership'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining(
        'WHERE m.id = $1 AND m.customer_account_id = $2',
      ),
      ['another-customers-membership', 'customer-account-1'],
    );
  });

  it('issues one opaque personal QR credential and stores only its hash', async () => {
    const issuedDate = new Date('2026-01-01T00:00:00Z');
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM customer_qr_credentials')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO customer_qr_credentials')) {
        return {
          rows: [{
            issuedAt: issuedDate,
          }],
        };
      }
      return { rows: [] };
    });

    const credential = await service.issuePersonalQrCredential('user-1');
    expect(credential.credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(credential.credential).not.toContain('customer-account-1');
    expect(credential.issuedAt).toBe(issuedDate);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO customer_qr_credentials'),
      ['customer-account-1', expect.stringMatching(/^[0-9a-f]{64}$/)],
    );
  });

  it('rejects issuance when an active personal QR credential already exists', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM customer_qr_credentials')) {
        return {
          rows: [{
            credential: 'existing-hash',
            issuedAt: new Date('2026-01-01T00:00:00Z'),
          }],
        };
      }
      return { rows: [] };
    });

    await expect(
      service.issuePersonalQrCredential('user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rotates personal QR credential by revoking previous and issuing new credential', async () => {
    const newIssuedDate = new Date('2026-02-01T00:00:00Z');
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('UPDATE customer_qr_credentials')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO customer_qr_credentials')) {
        return {
          rows: [{
            issuedAt: newIssuedDate,
          }],
        };
      }
      return { rows: [] };
    });

    const rotated = await service.rotatePersonalQrCredential('user-1');
    expect(rotated.credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(rotated.issuedAt).toBe(newIssuedDate);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE customer_qr_credentials'),
      ['customer-account-1'],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO customer_qr_credentials'),
      ['customer-account-1', expect.stringMatching(/^[0-9a-f]{64}$/)],
    );
  });

  it('returns credential metadata without revealing raw secret or hash on retrieval', async () => {
    const issuedDate = new Date('2026-01-01T00:00:00Z');
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM customer_qr_credentials')) {
        return {
          rows: [{
            issuedAt: issuedDate,
            active: true,
          }],
        };
      }
      return { rows: [] };
    });

    const status = await service.getPersonalQrCredential('user-1');
    expect(status).toEqual({
      issuedAt: issuedDate,
      active: true,
    });
    expect((status as any).credential).toBeUndefined();
    expect((status as any).credentialHash).toBeUndefined();
  });
});
