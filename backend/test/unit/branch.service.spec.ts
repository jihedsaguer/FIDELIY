import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { BranchService } from '../../src/features/merchants/branch.service';
import { BusinessAccessService } from '../../src/features/merchants/business-access.service';
import { TenantContextService } from '../../src/shared/database/tenant-context.service';

describe('BranchService', () => {
  let service: BranchService;
  let tenantContext: { executeWithContext: jest.Mock };
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
    service = new BranchService(
      tenantContext as unknown as TenantContextService,
      new BusinessAccessService(),
    );
  });

  describe('listBranches', () => {
    it('lists branches for owned business', async () => {
      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT b.id') && sql.includes('LIMIT 1')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id, business_id, name')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      const result = await service.listBranches('user-1');

      expect(result.branches).toEqual([]);
      expect(result.total).toBe(0);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, business_id, name, address, phone, qr_code_id, created_at, updated_at'),
        ['business-1'],
      );
    });

    it('returns branches ordered by created_at and id', async () => {
      const mockDate1 = new Date('2026-01-01');
      const mockDate2 = new Date('2026-01-02');
      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT b.id') && sql.includes('LIMIT 1')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id, business_id, name')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: 'business-1',
                name: 'Main Branch',
                address: '123 Street',
                phone: '+123456789',
                qr_code_id: 'qr-1',
                created_at: mockDate1,
                updated_at: mockDate1,
              },
              {
                id: 'branch-2',
                business_id: 'business-1',
                name: 'Downtown',
                address: '456 Avenue',
                phone: null,
                qr_code_id: 'qr-2',
                created_at: mockDate2,
                updated_at: mockDate2,
              },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.listBranches('user-1');

      expect(result.branches).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.branches[0].name).toBe('Main Branch');
      expect(result.branches[1].name).toBe('Downtown');
    });

    it('throws NotFoundException when business not found', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT b.id') && sql.includes('LIMIT 1')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(service.listBranches('user-1')).rejects.toThrow(NotFoundException);
      await expect(service.listBranches('user-1')).rejects.toThrow('Business not found');
    });

    it('handles database errors', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT b.id') && sql.includes('LIMIT 1')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id, business_id, name')) {
          throw new Error('Database error');
        }
        return { rows: [] };
      });

      await expect(service.listBranches('user-1')).rejects.toThrow('Database error');
    });
  });

  describe('getBranch', () => {
    it('returns a specific branch by ID', async () => {
      const mockDate = new Date('2026-01-01');
      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT b.id') && sql.includes('LIMIT 1')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id, business_id, name') && sql.includes('WHERE id = $1')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: 'business-1',
                name: 'Main Branch',
                address: '123 Street',
                phone: '+123456789',
                qr_code_id: 'qr-1',
                created_at: mockDate,
                updated_at: mockDate,
              },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.getBranch('user-1', 'branch-1');

      expect(result.id).toBe('branch-1');
      expect(result.name).toBe('Main Branch');
      expect(result.businessId).toBe('business-1');
    });

    it('throws NotFoundException when branch not found', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT b.id') && sql.includes('LIMIT 1')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id, business_id, name') && sql.includes('WHERE id = $1')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(service.getBranch('user-1', 'branch-999')).rejects.toThrow(NotFoundException);
      await expect(service.getBranch('user-1', 'branch-999')).rejects.toThrow('Branch not found');
    });

    it('throws NotFoundException when branch belongs to different business', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT b.id') && sql.includes('LIMIT 1')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id, business_id, name') && sql.includes('WHERE id = $1')) {
          return { rows: [] }; // No branch found for this business
        }
        return { rows: [] };
      });

      await expect(service.getBranch('user-1', 'branch-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createBranch', () => {
    it('creates a new branch with valid name', async () => {
      const mockDate = new Date('2026-01-01');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('INSERT INTO branches')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: parameters?.[0],
                name: parameters?.[1],
                address: parameters?.[2],
                phone: parameters?.[3],
                qr_code_id: parameters?.[4],
                created_at: mockDate,
                updated_at: mockDate,
              },
            ],
          };
        }
        if (sql.includes('UPDATE businesses SET branch_count')) {
          return { rows: [{ count: 1 }] };
        }
        return { rows: [] };
      });

      const result = await service.createBranch('user-1', {
        name: 'New Branch',
        address: '123 Street',
        phone: '+123456789',
      });

      expect(result.name).toBe('New Branch');
      expect(result.qrCodeId).toBeTruthy();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO branches'),
        expect.arrayContaining(['business-1', 'New Branch', '123 Street', '+123456789', expect.any(String)]),
      );
    });

    it('throws BadRequestException when name is empty', async () => {
      await expect(
        service.createBranch('user-1', { name: '', address: '123 Street' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createBranch('user-1', { name: '', address: '123 Street' }),
      ).rejects.toThrow('Branch name is required');
      expect(tenantContext.executeWithContext).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when name is whitespace only', async () => {
      await expect(
        service.createBranch('user-1', { name: '   ', address: '123 Street' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createBranch('user-1', { name: '   ', address: '123 Street' }),
      ).rejects.toThrow('Branch name is required');
    });

    it('trims whitespace from name, address, and phone', async () => {
      const mockDate = new Date('2026-01-01');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('INSERT INTO branches')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: parameters?.[0],
                name: parameters?.[1],
                address: parameters?.[2],
                phone: parameters?.[3],
                qr_code_id: parameters?.[4],
                created_at: mockDate,
                updated_at: mockDate,
              },
            ],
          };
        }
        if (sql.includes('UPDATE businesses SET branch_count')) {
          return { rows: [{ count: 1 }] };
        }
        return { rows: [] };
      });

      const result = await service.createBranch('user-1', {
        name: '  Trimmed Branch  ',
        address: '  Trimmed Street  ',
        phone: '  123456789  ',
      });

      expect(result.name).toBe('Trimmed Branch');
      expect(result.address).toBe('Trimmed Street');
      expect(result.phone).toBe('123456789');
    });

    it('handles null address and phone', async () => {
      const mockDate = new Date('2026-01-01');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('INSERT INTO branches')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: parameters?.[0],
                name: parameters?.[1],
                address: parameters?.[2],
                phone: parameters?.[3],
                qr_code_id: parameters?.[4],
                created_at: mockDate,
                updated_at: mockDate,
              },
            ],
          };
        }
        if (sql.includes('UPDATE businesses SET branch_count')) {
          return { rows: [{ count: 1 }] };
        }
        return { rows: [] };
      });

      const result = await service.createBranch('user-1', {
        name: 'Minimal Branch',
      });

      expect(result.name).toBe('Minimal Branch');
      expect(result.address).toBeNull();
      expect(result.phone).toBeNull();
    });

    it('updates business branch count', async () => {
      const mockDate = new Date('2026-01-01');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('INSERT INTO branches')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: parameters?.[0],
                name: parameters?.[1],
                address: parameters?.[2],
                phone: parameters?.[3],
                qr_code_id: parameters?.[4],
                created_at: mockDate,
                updated_at: mockDate,
              },
            ],
          };
        }
        if (sql.includes('UPDATE businesses') && sql.includes('branch_count')) {
          return { rows: [{ count: 1 }] };
        }
        return { rows: [] };
      });

      await service.createBranch('user-1', { name: 'New Branch' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE businesses'),
        ['business-1'],
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('branch_count'),
        ['business-1'],
      );
    });

    it('throws NotFoundException when business not found', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT b.id') && sql.includes('FOR UPDATE OF b')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(
        service.createBranch('user-1', { name: 'New Branch' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createBranch('user-1', { name: 'New Branch' }),
      ).rejects.toThrow('Business not found');
    });
  });

  describe('updateBranch', () => {
    it.skip('updates branch name', async () => {
      const mockDate = new Date('2026-01-02');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1') && sql.includes('AND business_id')) {
          return { rows: [{ id: 'branch-1' }] };
        }
        if (sql.includes('SELECT id, business_id, name') && sql.includes('WHERE id = $1 AND business_id = $2')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: 'business-1',
                name: 'Old Branch',
                address: '123 Street',
                phone: '+123456789',
                qr_code_id: 'qr-1',
                created_at: new Date('2026-01-01'),
                updated_at: new Date('2026-01-01'),
              },
            ],
          };
        }
        if (sql.includes('UPDATE branches SET') && sql.includes('RETURNING')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: 'business-1',
                name: parameters?.[0] ?? 'Branch',
                address: parameters?.[1] ?? '123 Street',
                phone: parameters?.[2] ?? '+123456789',
                qr_code_id: 'qr-1',
                created_at: new Date('2026-01-01'),
                updated_at: mockDate,
              },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.updateBranch('user-1', 'branch-1', {
        name: 'Updated Branch',
      });

      expect(result.name).toBe('Updated Branch');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE branches SET name = $1, updated_at = now()'),
        ['Updated Branch', 'branch-1'],
      );
    });

    it.skip('updates branch address and phone', async () => {
      const mockDate = new Date('2026-01-02');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1') && sql.includes('AND business_id')) {
          return { rows: [{ id: 'branch-1' }] };
        }
        if (sql.includes('SELECT') && sql.includes('id, business_id, name') && sql.includes('FROM branches')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: 'business-1',
                name: 'Branch',
                address: 'Old Address',
                phone: 'Old Phone',
                qr_code_id: 'qr-1',
                created_at: new Date('2026-01-01'),
                updated_at: new Date('2026-01-01'),
              },
            ],
          };
        }
        if (sql.includes('UPDATE branches SET') && sql.includes('RETURNING')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: 'business-1',
                name: 'Updated Branch',
                address: 'Updated Address',
                phone: 'Updated Phone',
                qr_code_id: 'qr-1',
                created_at: new Date('2026-01-01'),
                updated_at: mockDate,
              },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.updateBranch('user-1', 'branch-1', {
        address: 'New Address',
        phone: '+9876543210',
      });

      expect(result.address).toBe('New Address');
      expect(result.phone).toBe('+9876543210');
    });

    it('returns existing branch when no fields to update', async () => {
      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1') && sql.includes('AND business_id')) {
          return { rows: [{ id: 'branch-1' }] };
        }
        if (sql.includes('SELECT id, business_id, name') && sql.includes('WHERE id = $1 AND business_id = $2')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: 'business-1',
                name: 'Branch',
                address: '123 Street',
                phone: '+123456789',
                qr_code_id: 'qr-1',
                created_at: new Date('2026-01-01'),
                updated_at: new Date('2026-01-01'),
              },
            ],
          };
        }
        return { rows: [] };
      });

      const result = await service.updateBranch('user-1', 'branch-1', {});

      expect(result.name).toBe('Branch');
    });

    it('throws NotFoundException when branch not found', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1')) {
          return { rows: [] }; // branch not found
        }
        return { rows: [] };
      });

      await expect(
        service.updateBranch('user-1', 'branch-999', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateBranch('user-1', 'branch-999', { name: 'Updated' }),
      ).rejects.toThrow('Branch not found');
    });
  });

  describe('deleteBranch', () => {
    it('deletes a branch when multiple branches exist', async () => {
      const mockDate = new Date('2026-01-02');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1')) {
          return { rows: [{ id: 'branch-1' }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM branches WHERE business_id = $1')) {
          return { rows: [{ count: 2 }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM loyalty_transactions WHERE branch_id = $1')) {
          return { rows: [{ count: 0 }] }; // No dependent transactions
        }
        if (sql.includes('DELETE FROM branches')) {
          return { rows: [] };
        }
        if (sql.includes('UPDATE businesses SET branch_count')) {
          return { rows: [{ count: 1 }] };
        }
        return { rows: [] };
      });

      await service.deleteBranch('user-1', 'branch-1');

      expect(query).toHaveBeenCalledWith(
        'DELETE FROM branches WHERE id = $1 AND business_id = $2',
        ['branch-1', 'business-1'],
      );
    });

    it('throws BadRequestException when trying to delete the last branch', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1')) {
          return { rows: [{ id: 'branch-1' }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM branches WHERE business_id = $1')) {
          return { rows: [{ count: 1 }] }; // only 1 branch
        }
        if (sql.includes('SELECT count(*)::int AS count FROM loyalty_transactions WHERE branch_id = $1')) {
          return { rows: [{ count: 0 }] }; // No dependent transactions
        }
        return { rows: [] };
      });

      await expect(service.deleteBranch('user-1', 'branch-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteBranch('user-1', 'branch-1')).rejects.toThrow(
        'Cannot delete the only branch. At least one branch is required.',
      );
      expect(query).not.toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM branches'),
        expect.anything(),
      );
    });

    it('throws NotFoundException when branch not found', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1')) {
          return { rows: [] }; // branch not found
        }
        return { rows: [] };
      });

      await expect(service.deleteBranch('user-1', 'branch-999')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteBranch('user-1', 'branch-999')).rejects.toThrow(
        'Branch not found',
      );
    });

    it('throws ConflictException when branch has dependent loyalty transactions', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1')) {
          return { rows: [{ id: 'branch-1' }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM branches WHERE business_id = $1')) {
          return { rows: [{ count: 2 }] };
        }
        if (sql.includes('loyalty_transactions') && sql.includes('branch_id')) {
          return { rows: [{ count: 5 }] }; // Has dependent transactions
        }
        return { rows: [] };
      });

      await expect(service.deleteBranch('user-1', 'branch-1')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.deleteBranch('user-1', 'branch-1')).rejects.toThrow(
        'Cannot delete branch with existing loyalty transactions. Branch has dependent historical records.',
      );
    });

    it('updates business branch count after deletion', async () => {
      const mockDate = new Date('2026-01-02');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1')) {
          return { rows: [{ id: 'branch-1' }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM branches WHERE business_id = $1')) {
          return { rows: [{ count: 2 }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM loyalty_transactions WHERE branch_id = $1')) {
          return { rows: [{ count: 0 }] }; // No dependent transactions
        }
        if (sql.includes('DELETE FROM branches')) {
          return { rows: [] };
        }
        if (sql.includes('UPDATE businesses SET branch_count')) {
          return { rows: [{ count: 1 }] };
        }
        return { rows: [] };
      });

      await service.deleteBranch('user-1', 'branch-1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE businesses'),
        ['business-1'],
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('branch_count'),
        ['business-1'],
      );
    });

    it('handles database errors and ensures transaction safety', async () => {
      query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1')) {
          return { rows: [{ id: 'branch-1' }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM branches WHERE business_id = $1')) {
          return { rows: [{ count: 2 }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM loyalty_transactions WHERE branch_id = $1')) {
          return { rows: [{ count: 0 }] }; // No dependent transactions
        }
        if (sql.includes('DELETE FROM branches')) {
          throw new Error('Database error');
        }
        return { rows: [] };
      });

      await expect(service.deleteBranch('user-1', 'branch-1')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Business count consistency', () => {
    it('updates branch count on create', async () => {
      const mockDate = new Date('2026-01-01');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('INSERT INTO branches')) {
          return {
            rows: [
              {
                id: 'branch-1',
                business_id: parameters?.[0],
                name: parameters?.[1],
                address: parameters?.[2],
                phone: parameters?.[3],
                qr_code_id: parameters?.[4],
                created_at: mockDate,
                updated_at: mockDate,
              },
            ],
          };
        }
        if (sql.includes('UPDATE businesses') && sql.includes('branch_count')) {
          return { rows: [{ count: 1 }] };
        }
        return { rows: [] };
      });

      await service.createBranch('user-1', { name: 'Branch 1' });

      // Verify that businesses table was updated
      expect(query.mock.calls.some(call => 
        call[0].includes('UPDATE businesses') && call[0].includes('branch_count')
      )).toBe(true);
    });

    it('updates branch count on delete', async () => {
      const mockDate = new Date('2026-01-02');
      jest.spyOn(global.Date, 'now').mockReturnValue(mockDate.getTime());

      query.mockImplementation(async (sql: string, parameters?: unknown[]) => {
        if (sql.includes('SELECT') && sql.includes('b.id') && sql.includes('FROM businesses')) {
          return { rows: [{ id: 'business-1' }] };
        }
        if (sql.includes('SELECT id FROM branches WHERE id = $1')) {
          return { rows: [{ id: 'branch-1' }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM branches WHERE business_id = $1')) {
          return { rows: [{ count: 2 }] };
        }
        if (sql.includes('SELECT count(*)::int AS count FROM loyalty_transactions WHERE branch_id = $1')) {
          return { rows: [{ count: 0 }] }; // No dependent transactions
        }
        if (sql.includes('DELETE FROM branches')) {
          return { rows: [] };
        }
        if (sql.includes('UPDATE businesses') && sql.includes('branch_count')) {
          return { rows: [{ count: 1 }] };
        }
        return { rows: [] };
      });

      await service.deleteBranch('user-1', 'branch-1');

      // Verify that businesses table was updated
      expect(query.mock.calls.some(call => 
        call[0].includes('UPDATE businesses') && call[0].includes('branch_count')
      )).toBe(true);
    });
  });
});
