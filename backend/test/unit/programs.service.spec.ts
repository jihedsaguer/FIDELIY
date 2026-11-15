import { BadRequestException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { BusinessAccessService } from '../../src/features/merchants/business-access.service';
import { ProgramsService } from '../../src/features/programs/programs.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';

describe('ProgramsService', () => {
  let service: ProgramsService;
  let tenantContext: {
    executeWithContext: jest.Mock;
  };
  let query: jest.Mock;
  let connection: { query: jest.Mock };

  beforeEach(() => {
    query = jest.fn();
    connection = { query };
    tenantContext = {
      executeWithContext: jest.fn(
        async (_userId: string, operation: (client: PoolClient) => unknown) =>
          operation(connection as unknown as PoolClient),
      ),
    };
    service = new ProgramsService(
      tenantContext as unknown as TenantContextService,
      new BusinessAccessService(),
    );
  });

  it.each([
    ['stamps', { stamps: {} }, ['stamps']],
    ['points', { points: {} }, ['points']],
    ['both', { stamps: {}, points: {} }, ['stamps', 'points']],
  ] as const)(
    'creates a %s programme with a record for each enabled type',
    async (type, configurations, expectedTypes) => {
      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT b.id')) return { rows: [{ id: 'business-1' }] };
        if (sql.includes('SELECT id') && sql.includes("status = 'active'")) {
          return { rows: [] };
        }
        if (sql.includes('COALESCE(MAX(version)')) {
          return { rows: [{ version: 1 }] };
        }
        if (sql.includes('INSERT INTO programs')) {
          return {
            rows: [{
              id: 'program-1',
              businessId: parameters?.[0],
              name: parameters?.[1],
              description: parameters?.[2],
              type: parameters?.[3],
              version: parameters?.[4],
              status: 'active',
              activatedAt: new Date('2026-01-01T00:00:00Z'),
              deactivatedAt: null,
              createdAt: new Date('2026-01-01T00:00:00Z'),
            }],
          };
        }
        return { rows: [] };
      });

      const result = await service.createInitial('user-1', {
        type,
        configurations,
      });

      expect(result.type).toBe(type);
      expect(result.version).toBe(1);
      expect(Object.keys(result.configurations).sort()).toEqual(['points', 'stamps'].sort());
      const insertedTypes = query.mock.calls
        .filter(([sql]) => sql.includes('INSERT INTO program_configurations'))
        .map(([, parameters]) => (parameters as unknown[])[1]);
      expect(insertedTypes.sort()).toEqual(expectedTypes.sort());
    },
  );

  it.each([
    [{ type: 'stamps', configurations: {} }, 'missing enabled configuration'],
    [
      { type: 'both', configurations: { stamps: {} } },
      'incomplete combined configuration',
    ],
    [
      { type: 'points', configurations: { points: {}, stamps: {} } },
      'configuration for a disabled type',
    ],
    [
      { type: 'points', configurations: { points: [] } },
      'non-object configuration',
    ],
  ])('rejects invalid or incomplete configuration (%s)', async (input) => {
    await expect(
      service.createInitial('user-1', input as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tenantContext.executeWithContext).not.toHaveBeenCalled();
  });

  it('creates a new version while retaining the previous version and configurations', async () => {
    query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
      if (sql.includes('SELECT b.id')) return { rows: [{ id: 'business-1' }] };
      if (sql.includes('SELECT id') && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 'program-1' }] };
      }
      if (sql.includes('COALESCE(MAX(version)')) {
        return { rows: [{ version: 3 }] };
      }
      if (sql.includes('INSERT INTO programs')) {
        return {
          rows: [{
            id: 'program-3',
            businessId: parameters?.[0],
            name: parameters?.[1],
            description: parameters?.[2],
            type: parameters?.[3],
            version: parameters?.[4],
            status: 'active',
            activatedAt: new Date('2026-03-01T00:00:00Z'),
            deactivatedAt: null,
            createdAt: new Date('2026-03-01T00:00:00Z'),
          }],
        };
      }
      return { rows: [] };
    });

    const result = await service.createVersion('user-1', {
      type: 'both',
      configurations: { stamps: {}, points: {} },
    });

    expect(result.id).toBe('program-3');
    expect(result.version).toBe(3);
    expect(result.status).toBe('active');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        "SET status = 'inactive', deactivated_at = now()",
      ),
      ['program-1'],
    );
    expect(query.mock.calls.some(([sql]) => sql.includes('DELETE'))).toBe(false);
    expect(query.mock.calls.some(([sql]) =>
      sql.includes('INSERT INTO program_configurations'),
    )).toBe(true);
  });

  it('derives the business from the authenticated user for reads', async () => {
    query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
      if (sql.includes('SELECT b.id')) {
        expect(parameters).toEqual(['authenticated-user']);
        return { rows: [{ id: 'owned-business' }] };
      }
      return {
        rows: [{
          id: 'program-1',
          businessId: 'owned-business',
          type: 'stamps',
          version: 1,
          status: 'active',
          activatedAt: new Date('2026-01-01T00:00:00Z'),
          deactivatedAt: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          name: null,
          description: null,
          configurations: [{ type: 'stamps', settings: {} }],
        }],
      };
    });

    const current = await service.getCurrent('authenticated-user');

    expect(current?.businessId).toBe('owned-business');
    expect(current?.configurations).toEqual({ stamps: {}, points: {} });
  });

  it('keeps the business not-found message', async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(service.getCurrent('user-1')).rejects.toThrow('Business not found');
  });
});
