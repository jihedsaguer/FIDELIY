import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * DTO for creating a new branch
 */
export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;
}

/**
 * DTO for updating an existing branch
 */
export class UpdateBranchDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;
}

/**
 * Response DTO for branch data
 */
export class BranchResponseDto {
  id!: string;
  businessId!: string;
  name!: string;
  address!: string | null;
  phone!: string | null;
  qrCodeId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Response DTO for branch list
 */
export class BranchListResponseDto {
  branches!: BranchResponseDto[];
  total!: number;
}
