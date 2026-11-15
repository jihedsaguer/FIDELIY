import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { TenantContextService } from '../../shared/database/tenant-context.service';
import { hashCustomerQrCredential } from '../../shared/security/customer-qr';
import { BusinessAccessService } from './business-access.service';

interface ResolvedCustomerRow {
  customerName: string;
  membershipStatus: 'active' | 'inactive' | null;
  joinedAt: Date | null;
}

@Injectable()
export class MerchantCustomerService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly businessAccess: BusinessAccessService,
  ) {}

  resolveCustomerQr(userId: string, credential: string) {
    const credentialHash = hashCustomerQrCredential(credential);
    return this.tenantContext.executeWithContext(userId, async (connection) => {
      const business = await this.getOwnedBusiness(connection, userId);
      const result = await connection.query<ResolvedCustomerRow>(
        `SELECT u.name AS "customerName",
                m.status AS "membershipStatus",
                m.joined_at AS "joinedAt"
         FROM customer_qr_credentials qr
         JOIN customer_accounts ca ON ca.id = qr.customer_account_id
         JOIN users u ON u.id = ca.user_id
         LEFT JOIN customer_business_memberships m
           ON m.customer_account_id = ca.id
          AND m.business_id = $2
         WHERE qr.credential_hash = $1
           AND qr.revoked_at IS NULL
         LIMIT 1`,
        [credentialHash, business.id],
      );
      const customer = result.rows[0];
      if (!customer) {
        throw new NotFoundException('Customer QR credential is invalid or revoked');
      }
      if (customer.membershipStatus !== 'active' || !customer.joinedAt) {
        throw new ConflictException(
          'Customer must join this business before loyalty operations can continue',
        );
      }
      return {
        customer: { name: customer.customerName },
        membership: {
          status: customer.membershipStatus,
          joinedAt: customer.joinedAt,
        },
      };
    });
  }

  private async getOwnedBusiness(
    connection: PoolClient,
    userId: string,
  ): Promise<{ id: string }> {
    const business = await this.businessAccess.findOwnedBusiness(
      connection,
      userId,
    );
    if (!business) {
      throw new NotFoundException('Business not found for this merchant');
    }
    return business;
  }
}
