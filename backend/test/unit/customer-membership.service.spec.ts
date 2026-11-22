import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { CustomerMembershipService } from '../../src/features/customers/customer-membership.service';
import { LoyaltyLedgerService } from '../../src/features/loyalty/loyalty-ledger.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';
import {
  deriveCustomerQrCodes,
  deriveCustomerQrCredential,
  deriveCustomerQrShortCode,
  hashCustomerQrCredential,
  hashCustomerQrShortCode,
} from '../../src/shared/security/customer-qr';

describe('CustomerMembershipService', () => {
  let service: CustomerMembershipService;
  let query: jest.Mock;
  let connection: { query: jest.Mock };
  let tenantContext: { executeWithContext: jest.Mock };
  let ledger: { getBalance: jest.Mock };

  beforeEach(() => {
    query = jest.fn();
    connection = { query };
    tenantContext = {
      executeWithContext: jest.fn(
        async (_userId: string, operation: (client: PoolClient) => unknown) =>
          operation(connection as unknown as PoolClient),
      ),
    };
    ledger = {
      getBalance: jest.fn(async () => ({ stamps: 0, points: 0 })),
    };
    service = new CustomerMembershipService(
      tenantContext as unknown as TenantContextService,
      ledger as unknown as LoyaltyLedgerService,
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

  it('issues a derived personal QR credential and short ID and stores only their hashes', async () => {
    const issuedDate = new Date('2026-01-01T00:00:00Z');
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('FROM customer_qr_credentials')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO customer_qr_credentials')) {
        return { rows: [{ issuedAt: issuedDate }] };
      }
      return { rows: [] };
    });

    const issued = await service.issuePersonalQrCredential('user-1');
    const insert = query.mock.calls.find(([sql]) =>
      (sql as string).includes('INSERT INTO customer_qr_credentials'),
    ) as [string, string[]];
    const [rowId, accountId, credentialHash, shortCodeHash] = insert[1];

    expect(accountId).toBe('customer-account-1');
    expect(rowId).toMatch(/^[0-9a-f-]{36}$/);
    expect(issued.credential).toBe(
      deriveCustomerQrCredential('customer-account-1', rowId),
    );
    expect(issued.credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(issued.shortCode).toBe(
      deriveCustomerQrShortCode('customer-account-1', rowId),
    );
    expect(credentialHash).toBe(hashCustomerQrCredential(issued.credential));
    expect(shortCodeHash).toBe(hashCustomerQrShortCode(issued.shortCode));
    expect(insert[1]).not.toContain(issued.credential);
    expect(insert[1]).not.toContain(issued.shortCode);
    expect(issued.issuedAt).toBe(issuedDate);
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

  it('rotates by revoking the previous row and inserting a new row id with new codes', async () => {
    const newIssuedDate = new Date('2026-02-01T00:00:00Z');
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM customer_accounts') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'customer-account-1' }] };
      }
      if (sql.includes('INSERT INTO customer_qr_credentials')) {
        return { rows: [{ issuedAt: newIssuedDate }] };
      }
      return { rows: [] };
    });

    const first = await service.rotatePersonalQrCredential('user-1');
    const second = await service.rotatePersonalQrCredential('user-1');

    expect(first.credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.issuedAt).toBe(newIssuedDate);
    expect(second.credential).not.toBe(first.credential);
    expect(second.shortCode).not.toBe(first.shortCode);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE customer_qr_credentials'),
      ['customer-account-1'],
    );
    const inserts = query.mock.calls.filter(([sql]) =>
      (sql as string).includes('INSERT INTO customer_qr_credentials'),
    ) as [string, string[]][];
    expect(inserts).toHaveLength(2);
    expect(inserts[0][1][0]).not.toBe(inserts[1][1][0]);
    expect(inserts[1][1][2]).toBe(hashCustomerQrCredential(second.credential));
    expect(inserts[1][1][3]).toBe(hashCustomerQrShortCode(second.shortCode));
  });

  describe('getPersonalQrCredential', () => {
    const issuedDate = new Date('2026-01-01T00:00:00Z');

    function mockActiveRow(row: Record<string, unknown> | null) {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM customer_accounts')) {
          return { rows: [{ id: 'customer-account-1' }] };
        }
        if (sql.includes('FROM customer_qr_credentials')) {
          return { rows: row ? [row] : [] };
        }
        return { rows: [] };
      });
    }

    it('returns the current credential and short ID when the stored hash matches', async () => {
      const rowId = '44444444-4444-4444-8444-444444444444';
      const codes = deriveCustomerQrCodes('customer-account-1', rowId);
      mockActiveRow({
        id: rowId,
        credentialHash: codes.credentialHash,
        issuedAt: issuedDate,
      });

      const status = await service.getPersonalQrCredential('user-1');
      expect(status).toEqual({
        issuedAt: issuedDate,
        active: true,
        credential: codes.credential,
        shortCode: codes.shortCode,
      });
      expect((status as any).credentialHash).toBeUndefined();
      expect((status as any).shortCodeHash).toBeUndefined();
      expect((status as any).id).toBeUndefined();
    });

    it('flags a legacy random credential as requiring rotation without exposing the hash', async () => {
      mockActiveRow({
        id: '44444444-4444-4444-8444-444444444444',
        credentialHash: hashCustomerQrCredential('legacy-random-credential'),
        issuedAt: issuedDate,
      });

      const status = await service.getPersonalQrCredential('user-1');
      expect(status).toEqual({
        issuedAt: issuedDate,
        active: true,
        credential: null,
        shortCode: null,
        requiresRotation: true,
      });
    });

    it('flags a credential derived under a different key as requiring rotation', async () => {
      const rowId = '44444444-4444-4444-8444-444444444444';
      const oldHash = deriveCustomerQrCodes('customer-account-1', rowId).credentialHash;
      const previous = process.env.CUSTOMER_QR_SECRET;
      process.env.CUSTOMER_QR_SECRET = Buffer.alloc(32, 5).toString('hex');
      try {
        mockActiveRow({ id: rowId, credentialHash: oldHash, issuedAt: issuedDate });
        const status = await service.getPersonalQrCredential('user-1');
        expect(status).toMatchObject({ credential: null, requiresRotation: true });
      } finally {
        process.env.CUSTOMER_QR_SECRET = previous as string;
      }
    });

    it('throws NotFound when no active credential exists', async () => {
      mockActiveRow(null);
      await expect(
        service.getPersonalQrCredential('user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('balance and rewards on membership responses', () => {
    const row = (id: string, businessId: string, programType: string | null) => ({
      id,
      businessId,
      status: 'active',
      joinedAt: new Date('2026-01-01T00:00:00Z'),
      leftAt: null,
      businessName: `Business ${businessId}`,
      logoUrl: null,
      programType,
      programVersion: programType ? 1 : null,
    });

    function mockData(rows: unknown[]) {
      query.mockImplementation(async (sql: string, params?: unknown[]) => {
        if (sql.includes('FROM customer_accounts')) {
          return { rows: [{ id: 'customer-account-1' }] };
        }
        if (sql.includes('FROM program_configurations')) {
          expect(sql).toContain("p.status = 'active'");
          if (params?.[0] === 'business-1') {
            return {
              rows: [
                {
                  id: 'cfg-stamps',
                  type: 'stamps',
                  settings: {
                    rewardThresholds: [
                      { name: 'Free coffee', stampsRequired: 10 },
                      { name: 'Hidden', stampsRequired: 5, isActive: false },
                    ],
                  },
                },
                {
                  id: 'cfg-points',
                  type: 'points',
                  settings: {
                    rewardThresholds: [{ name: 'Cake', pointsRequired: 200 }],
                  },
                },
              ],
            };
          }
          return { rows: [] };
        }
        if (sql.includes('FROM membership_lifecycle_events')) {
          return { rows: [] };
        }
        if (sql.includes('FROM customer_business_memberships m')) {
          return { rows };
        }
        return { rows: [] };
      });
    }

    it('adds ledger balance and active-programme rewards to the list', async () => {
      mockData([row('m-1', 'business-1', 'both'), row('m-2', 'business-2', null)]);
      ledger.getBalance.mockImplementation(
        async (_c: unknown, businessId: string) =>
          businessId === 'business-1'
            ? { stamps: 4, points: 150 }
            : { stamps: 0, points: 0 },
      );

      const list = await service.listMemberships('user-1');

      expect(ledger.getBalance).toHaveBeenCalledWith(connection, 'business-1', 'm-1');
      expect(list[0]).toMatchObject({
        id: 'm-1',
        balance: { stamps: 4, points: 150 },
        rewards: [
          { name: 'Free coffee', activityType: 'stamps', cost: 10 },
          { name: 'Cake', activityType: 'points', cost: 200 },
        ],
      });
      expect(list[0]).not.toHaveProperty('businessId');
      expect(list[1]).toMatchObject({
        balance: { stamps: 0, points: 0 },
        rewards: [],
        program: null,
      });
    });

    it('adds balance and rewards to the detail response', async () => {
      mockData([row('m-1', 'business-1', 'stamps')]);
      ledger.getBalance.mockResolvedValue({ stamps: 12, points: 0 });

      const detail = await service.getMembership('user-1', 'm-1');

      expect(detail).toMatchObject({
        balance: { stamps: 12, points: 0 },
        rewards: [
          { name: 'Free coffee', activityType: 'stamps', cost: 10 },
          { name: 'Cake', activityType: 'points', cost: 200 },
        ],
        lifecycle: [],
      });
      expect(detail).not.toHaveProperty('businessId');
    });
  });
});
