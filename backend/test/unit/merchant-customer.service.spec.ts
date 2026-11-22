import { ConflictException, NotFoundException } from '@nestjs/common';

import type { PoolClient } from 'pg';
import { BusinessAccessService } from '../../src/features/merchants/business-access.service';
import { MerchantCustomerService } from '../../src/features/merchants/merchant-customer.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';
import {
  hashCustomerQrCredential,
  hashCustomerQrShortCode,
} from '../../src/shared/security/customer-qr';

interface FakeMember {
  membershipId: string;
  businessId: string;
  name: string;
  phoneNumber: string;
  status: 'active' | 'inactive';
  joinedAt: Date;
  leftAt: Date | null;
  lastActivityAt: Date | null;
  balance: { stamps: number; points: number };
}

function member(i: number, overrides: Partial<FakeMember> = {}): FakeMember {
  return {
    membershipId: `m-${String(i).padStart(3, '0')}`,
    businessId: 'business-A',
    name: `Customer ${i}`,
    phoneNumber: `+2165550${String(i).padStart(4, '0')}`,
    status: 'active',
    joinedAt: new Date(Date.UTC(2026, 0, 1 + i)),
    leftAt: null,
    lastActivityAt: null,
    balance: { stamps: 0, points: 0 },
    ...overrides,
  };
}

/**
 * In-memory stand-in for the three list queries (count, page, balances). It
 * reads only what the service sends as parameters, so scoping, filters and
 * paging are observed through the service's behaviour.
 */
function createListFake(members: FakeMember[], businessByUser: Record<string, string>) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const matches = (sql: string, params: unknown[]) => {
    const businessId = params[0];
    const status = params.find((p) => p === 'active' || p === 'inactive');
    const pattern = params.find((p) => typeof p === 'string' && p.startsWith('%')) as
      | string
      | undefined;
    const needle = pattern?.slice(1, -1).replace(/\\([\\%_])/g, '$1').toLowerCase();
    return members
      .filter((m) => m.businessId === businessId)
      .filter((m) => !status || m.status === status)
      .filter(
        (m) =>
          !needle ||
          m.name.toLowerCase().includes(needle) ||
          m.phoneNumber.toLowerCase().includes(needle),
      )
      .sort(
        (a, b) =>
          b.joinedAt.getTime() - a.joinedAt.getTime() ||
          a.membershipId.localeCompare(b.membershipId),
      );
  };
  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.includes('FROM businesses b')) {
      const id = businessByUser[params[0] as string];
      return { rows: id ? [{ id }] : [] };
    }
    if (sql.includes('COUNT(*)')) {
      return { rows: [{ total: matches(sql, params).length }] };
    }
    if (sql.includes('FROM loyalty_activity_entries')) {
      const ids = params[1] as string[];
      const rows: Array<Record<string, unknown>> = [];
      for (const m of members) {
        if (m.businessId !== params[0] || !ids.includes(m.membershipId)) continue;
        if (m.balance.stamps) rows.push({ membershipId: m.membershipId, activityType: 'stamps', balance: String(m.balance.stamps) });
        if (m.balance.points) rows.push({ membershipId: m.membershipId, activityType: 'points', balance: String(m.balance.points) });
      }
      return { rows };
    }
    if (sql.includes('FROM customer_business_memberships')) {
      const limit = params[params.length - 2] as number;
      const offset = params[params.length - 1] as number;
      return {
        rows: matches(sql, params)
          .slice(offset, offset + limit)
          .map((m) => ({
            membershipId: m.membershipId,
            customerName: m.name,
            phoneNumber: m.phoneNumber,
            status: m.status,
            joinedAt: m.joinedAt,
            leftAt: m.leftAt,
            lastActivityAt: m.lastActivityAt,
          })),
      };
    }
    return { rows: [] };
  });
  return { query, calls };
}

describe('MerchantCustomerService - customer list', () => {
  const build = (members: FakeMember[]) => {
    const fake = createListFake(members, { 'owner-A': 'business-A', 'owner-B': 'business-B' });
    const tenantContext = {
      executeWithContext: jest.fn(
        async (_userId: string, operation: (client: PoolClient) => unknown) =>
          operation({ query: fake.query } as unknown as PoolClient),
      ),
    };
    const service = new MerchantCustomerService(
      tenantContext as unknown as TenantContextService,
      new BusinessAccessService(),
    );
    return { service, fake, tenantContext };
  };

  it('runs inside the tenant context of the session user and returns only that business', async () => {
    const { service, tenantContext } = build([
      member(1),
      member(2, { businessId: 'business-B', name: 'Other Business Customer' }),
    ]);

    const result = await service.listCustomers('owner-A', {});

    expect(tenantContext.executeWithContext).toHaveBeenCalledWith('owner-A', expect.any(Function));
    expect(result.total).toBe(1);
    expect(result.items.map((i) => i.membershipId)).toEqual(['m-001']);
    expect(JSON.stringify(result)).not.toContain('Other Business Customer');
  });

  it('returns the exact item shape with the full phone number and no internal ids', async () => {
    const joinedAt = new Date('2026-03-01T10:00:00Z');
    const lastActivityAt = new Date('2026-04-02T09:00:00Z');
    const { service } = build([
      member(1, {
        name: 'Samir Ben Ali',
        phoneNumber: '+21655123456',
        joinedAt,
        lastActivityAt,
        balance: { stamps: 7, points: 120 },
      }),
    ]);

    const result = await service.listCustomers('owner-A', {});

    expect(result).toEqual({
      total: 1,
      items: [
        {
          membershipId: 'm-001',
          customer: { name: 'Samir Ben Ali', phoneNumber: '+21655123456' },
          status: 'active',
          joinedAt,
          leftAt: null,
          balance: { stamps: 7, points: 120 },
          lastActivityAt,
        },
      ],
    });
  });

  it('aggregates the ledger balance per membership and defaults to zero with null last activity', async () => {
    const { service } = build([
      member(1, { balance: { stamps: 3, points: 0 } }),
      member(2, { balance: { stamps: 0, points: 450 } }),
      member(3),
    ]);

    const { items } = await service.listCustomers('owner-A', {});
    const byId = Object.fromEntries(items.map((i) => [i.membershipId, i]));

    expect(byId['m-001'].balance).toEqual({ stamps: 3, points: 0 });
    expect(byId['m-002'].balance).toEqual({ stamps: 0, points: 450 });
    expect(byId['m-003'].balance).toEqual({ stamps: 0, points: 0 });
    expect(byId['m-003'].lastActivityAt).toBeNull();
  });

  it('orders newest members first and is deterministic on equal join dates', async () => {
    const sameDay = new Date('2026-05-01T00:00:00Z');
    const { service } = build([
      member(1, { joinedAt: new Date('2026-01-01T00:00:00Z') }),
      member(3, { joinedAt: sameDay }),
      member(2, { joinedAt: sameDay }),
    ]);

    const { items, } = await service.listCustomers('owner-A', {});
    expect(items.map((i) => i.membershipId)).toEqual(['m-002', 'm-003', 'm-001']);
  });

  it('declares a deterministic ORDER BY with an id tiebreak', async () => {
    const { service, fake } = build([member(1)]);
    await service.listCustomers('owner-A', {});
    const page = fake.calls.find((c) => c.sql.includes('LIMIT $'));
    expect(page?.sql).toMatch(/ORDER BY m\.joined_at DESC, m\.id ASC/);
  });

  it('paginates with default limit 25 and a requested offset', async () => {
    const members = Array.from({ length: 60 }, (_, i) => member(i + 1));
    const { service } = build(members);

    const first = await service.listCustomers('owner-A', {});
    expect(first.items).toHaveLength(25);
    expect(first.total).toBe(60);

    const third = await service.listCustomers('owner-A', { limit: 25, offset: 50 });
    expect(third.items).toHaveLength(10);
    expect(third.total).toBe(60);
  });

  it('caps the limit at 100 and floors negatives', async () => {
    const members = Array.from({ length: 130 }, (_, i) => member(i + 1));
    const { service, fake } = build(members);

    const result = await service.listCustomers('owner-A', { limit: 5000, offset: -4 });

    expect(result.items).toHaveLength(100);
    const page = fake.calls.find((c) => c.sql.includes('LIMIT $'));
    expect(page?.params.slice(-2)).toEqual([100, 0]);
  });

  it('filters by status and keeps inactive members with their leave date', async () => {
    const leftAt = new Date('2026-06-01T00:00:00Z');
    const { service } = build([
      member(1),
      member(2, { status: 'inactive', leftAt }),
    ]);

    const inactive = await service.listCustomers('owner-A', { status: 'inactive' });
    expect(inactive.total).toBe(1);
    expect(inactive.items[0]).toMatchObject({ membershipId: 'm-002', status: 'inactive', leftAt });

    const all = await service.listCustomers('owner-A', {});
    expect(all.total).toBe(2);
  });

  it('searches by name or phone, case-insensitively, using bound parameters only', async () => {
    const { service, fake } = build([
      member(1, { name: 'Samir Ben Ali' }),
      member(2, { name: 'Leila', phoneNumber: '+21655999000' }),
    ]);

    const byName = await service.listCustomers('owner-A', { search: '  sAMIr ' });
    expect(byName.items.map((i) => i.membershipId)).toEqual(['m-001']);

    const byPhone = await service.listCustomers('owner-A', { search: '55999' });
    expect(byPhone.items.map((i) => i.membershipId)).toEqual(['m-002']);

    for (const call of fake.calls.filter((c) => c.sql.includes('ILIKE'))) {
      expect(call.sql).not.toMatch(/samir|55999/i);
    }
  });

  it('escapes LIKE wildcards in the search term', async () => {
    const { service, fake } = build([member(1, { name: '100% Fan' }), member(2, { name: 'Other' })]);

    const result = await service.listCustomers('owner-A', { search: '%' });

    expect(result.items.map((i) => i.membershipId)).toEqual(['m-001']);
    const patterns = fake.calls
      .flatMap((c) => c.params)
      .filter((p) => typeof p === 'string' && p.startsWith('%'));
    expect(patterns).toContain('%\\%%');
    const withSearch = fake.calls.find((c) => c.sql.includes('ILIKE'));
    expect(withSearch?.sql).toContain("ESCAPE '\\'");
  });

  it('throws 404 when the merchant has no business and queries no customers', async () => {
    const { service, fake } = build([member(1)]);

    await expect(service.listCustomers('owner-without-business', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fake.calls.every((c) => c.sql.includes('FROM businesses b'))).toBe(true);
  });
});

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

  it('resolves through the short ID by its hash with the same membership check', async () => {
    query.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM businesses b')) {
        return { rows: [{ id: 'business-uuid-1' }] };
      }
      if (sql.includes('FROM customer_qr_credentials qr')) {
        expect(sql).toContain('qr.short_code_hash = $1');
        expect(params[0]).toBe(hashCustomerQrShortCode('K7M2Q-9XBD4'));
        return {
          rows: [{ customerName: 'Samir', membershipStatus: 'active', joinedAt: new Date() }],
        };
      }
      return { rows: [] };
    });

    const result = await service.resolveCustomerQr('merchant-user-1', 'k7m2q 9xbd4');
    expect(result.customer.name).toBe('Samir');
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

