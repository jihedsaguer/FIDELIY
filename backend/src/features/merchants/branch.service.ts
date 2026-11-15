import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

import { TenantContextService } from '../../shared/database/tenant-context.service';
import { BusinessAccessService } from './business-access.service';
import {
  CreateBranchDto,
  UpdateBranchDto,
  BranchResponseDto,
  BranchListResponseDto,
} from './dto/branch.dto';

interface BranchRow {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  qr_code_id: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class BranchService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

  async listBranches(userId: string): Promise<BranchListResponseDto> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const businessId = await this.getOwnedBusinessId(connection, userId);
      const result = await connection.query<BranchRow>(
        `SELECT id, business_id, name, address, phone, qr_code_id, created_at, updated_at
         FROM branches
         WHERE business_id = $1
         ORDER BY created_at ASC, id ASC`,
        [businessId],
      );

      const response = new BranchListResponseDto();
      response.branches = result.rows.map(this.mapRowToDto);
      response.total = result.rows.length;
      return response;
    });
  }

  async getBranch(userId: string, branchId: string): Promise<BranchResponseDto> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const businessId = await this.getOwnedBusinessId(connection, userId);
      const result = await connection.query<BranchRow>(
        `SELECT id, business_id, name, address, phone, qr_code_id, created_at, updated_at
         FROM branches
         WHERE id = $1 AND business_id = $2
         LIMIT 1`,
        [branchId, businessId],
      );

      if (!result.rows[0]) {
        throw new NotFoundException('Branch not found');
      }

      return this.mapRowToDto(result.rows[0]);
    });
  }

  async createBranch(
    userId: string,
    input: CreateBranchDto,
  ): Promise<BranchResponseDto> {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('Branch name is required');
    }

    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const businessId = await this.lockOwnedBusiness(connection, userId);

      const result = await connection.query<BranchRow>(
        `INSERT INTO branches (business_id, name, address, phone, qr_code_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, business_id, name, address, phone, qr_code_id, created_at, updated_at`,
        [
          businessId,
          name,
          input.address?.trim() ?? null,
          input.phone?.trim() ?? null,
          randomUUID(),
        ],
      );

      await connection.query(
        `UPDATE businesses
         SET branch_count = (
           SELECT count(*)::int FROM branches WHERE business_id = $1
         ), updated_at = now()
         WHERE id = $1`,
        [businessId],
      );

      return this.mapRowToDto(result.rows[0]);
    });
  }

  async updateBranch(
    userId: string,
    branchId: string,
    input: UpdateBranchDto,
  ): Promise<BranchResponseDto> {
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const businessId = await this.lockOwnedBusiness(connection, userId);

      // Verify branch exists and belongs to the business
      const existing = await connection.query<{ id: string }>(
        'SELECT id FROM branches WHERE id = $1 AND business_id = $2 LIMIT 1',
        [branchId, businessId],
      );
      if (!existing.rows[0]) {
        throw new NotFoundException('Branch not found');
      }

      const assignments: string[] = [];
      const values: Array<string | null> = [];
      const add = (column: string, value: string | null) => {
        values.push(value);
        assignments.push(`${column} = $${values.length}`);
      };

      if (input.name !== undefined) add('name', input.name.trim());
      if (input.address !== undefined) add('address', input.address?.trim() ?? null);
      if (input.phone !== undefined) add('phone', input.phone?.trim() ?? null);

      if (assignments.length === 0) {
        // No fields to update
        return this.getBranch(userId, branchId);
      }

      values.push(branchId);
      const result = await connection.query<BranchRow>(
        `UPDATE branches
         SET ${assignments.join(', ')}, updated_at = now()
         WHERE id = $${values.length}
         RETURNING id, business_id, name, address, phone, qr_code_id, created_at, updated_at`,
        values,
      );

      return this.mapRowToDto(result.rows[0]);
    });
  }

  async deleteBranch(userId: string, branchId: string): Promise<void> {
    await this.tenantContext.executeWithContext(userId, async (connection) => {
      const businessId = await this.lockOwnedBusiness(connection, userId);

      // Verify branch exists and belongs to the business
      const existing = await connection.query<{ id: string }>(
        'SELECT id FROM branches WHERE id = $1 AND business_id = $2 LIMIT 1',
        [branchId, businessId],
      );
      if (!existing.rows[0]) {
        throw new NotFoundException('Branch not found');
      }

      // Prevent deletion of the last branch
      const branchCount = await connection.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM branches WHERE business_id = $1',
        [businessId],
      );
      if (branchCount.rows[0].count <= 1) {
        throw new BadRequestException(
          'Cannot delete the only branch. At least one branch is required.',
        );
      }

      // Check for dependent loyalty transactions
      const transactions = await connection.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM loyalty_transactions WHERE branch_id = $1 AND business_id = $2',
        [branchId, businessId],
      );
      if (transactions.rows[0].count > 0) {
        throw new ConflictException(
          'Cannot delete branch with existing loyalty transactions. Branch has dependent historical records.',
        );
      }

      await connection.query(
        'DELETE FROM branches WHERE id = $1 AND business_id = $2',
        [branchId, businessId],
      );

      await connection.query(
        `UPDATE businesses
         SET branch_count = (
           SELECT count(*)::int FROM branches WHERE business_id = $1
         ), updated_at = now()
         WHERE id = $1`,
        [businessId],
      );
    });
  }

  private async getOwnedBusinessId(
    connection: PoolClient,
    userId: string,
  ): Promise<string> {
    const business = await this.businessAccess.findOwnedBusiness(
      connection,
      userId,
    );
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business.id;
  }

  private async lockOwnedBusiness(
    connection: PoolClient,
    userId: string,
  ): Promise<string> {
    const business = await this.businessAccess.lockOwnedBusinessForUpdate(
      connection,
      userId,
    );
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business.id;
  }

  private mapRowToDto(row: BranchRow): BranchResponseDto {
    const dto = new BranchResponseDto();
    dto.id = row.id;
    dto.businessId = row.business_id;
    dto.name = row.name;
    dto.address = row.address;
    dto.phone = row.phone;
    dto.qrCodeId = row.qr_code_id;
    dto.createdAt = row.created_at;
    dto.updatedAt = row.updated_at;
    return dto;
  }
}
