import type { PoolClient } from 'pg';
import { BusinessAccessService } from '../../src/features/merchants/business-access.service';

const FIND_OWNED_BUSINESS_SQL = `SELECT b.id
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       LIMIT 1`;

const LOCK_OWNED_BUSINESS_SQL = `SELECT b.id
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       FOR UPDATE OF b`;

const SHARE_OWNED_BUSINESS_SQL = `SELECT b.id, b.merchant_id AS "merchantAccountId"
       FROM businesses b
       JOIN merchant_accounts ma ON ma.id = b.merchant_id
       WHERE ma.user_id = $1
       FOR SHARE OF b, ma`;

describe('BusinessAccessService', () => {
  const service = new BusinessAccessService();
  let query: jest.Mock;
  let connection: PoolClient;

  beforeEach(() => {
    query = jest.fn();
    connection = { query } as unknown as PoolClient;
  });

  it('reads the owned business without a row lock', async () => {
    query.mockResolvedValue({ rows: [{ id: 'business-1' }] });

    await expect(
      service.findOwnedBusiness(connection, 'user-1'),
    ).resolves.toEqual({ id: 'business-1' });
    expect(query).toHaveBeenCalledWith(FIND_OWNED_BUSINESS_SQL, ['user-1']);
  });

  it('locks the business row for update and leaves the merchant account unlocked', async () => {
    query.mockResolvedValue({ rows: [{ id: 'business-1' }] });

    await expect(
      service.lockOwnedBusinessForUpdate(connection, 'user-1'),
    ).resolves.toEqual({ id: 'business-1' });
    expect(query).toHaveBeenCalledWith(LOCK_OWNED_BUSINESS_SQL, ['user-1']);
    expect(LOCK_OWNED_BUSINESS_SQL).toContain('FOR UPDATE OF b');
    expect(LOCK_OWNED_BUSINESS_SQL).not.toContain('LIMIT');
  });

  it('share-locks the business and merchant account and returns the account id', async () => {
    query.mockResolvedValue({
      rows: [{ id: 'business-1', merchantAccountId: 'merchant-1' }],
    });

    await expect(
      service.shareOwnedBusiness(connection, 'user-1'),
    ).resolves.toEqual({ id: 'business-1', merchantAccountId: 'merchant-1' });
    expect(query).toHaveBeenCalledWith(SHARE_OWNED_BUSINESS_SQL, ['user-1']);
    expect(SHARE_OWNED_BUSINESS_SQL).toContain('FOR SHARE OF b, ma');
    expect(SHARE_OWNED_BUSINESS_SQL).not.toContain('LIMIT');
  });

  it.each([
    ['findOwnedBusiness', (access: BusinessAccessService) =>
      access.findOwnedBusiness(connection, 'user-1')],
    ['lockOwnedBusinessForUpdate', (access: BusinessAccessService) =>
      access.lockOwnedBusinessForUpdate(connection, 'user-1')],
    ['shareOwnedBusiness', (access: BusinessAccessService) =>
      access.shareOwnedBusiness(connection, 'user-1')],
  ] as const)('returns null when %s finds no row', async (_name, call) => {
    query.mockResolvedValue({ rows: [] });
    await expect(call(service)).resolves.toBeNull();
  });
});
