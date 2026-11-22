import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const LIST_CUSTOMERS_DEFAULT_LIMIT = 25;
export const LIST_CUSTOMERS_MAX_LIMIT = 100;

/**
 * Query of GET /merchants/customers. The business is never a parameter: it is
 * derived from the session.
 */
export class ListCustomersQueryDto {
  /** Case-insensitive match on customer name or phone number. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIST_CUSTOMERS_MAX_LIMIT)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export interface MerchantCustomerListItem {
  membershipId: string;
  customer: { name: string; phoneNumber: string };
  status: 'active' | 'inactive';
  joinedAt: Date;
  leftAt: Date | null;
  balance: { stamps: number; points: number };
  lastActivityAt: Date | null;
}

export interface MerchantCustomerListResponse {
  items: MerchantCustomerListItem[];
  total: number;
}
