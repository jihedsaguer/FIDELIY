import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class BusinessThemeDto {
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primaryColor!: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  accentColor!: string;
}

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  name!: string;
}

export class UpdateBusinessSetupDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  businessPhone?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  phonePubliclyDisplayed?: boolean;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  logoUrl?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @ValidateNested()
  @Type(() => BusinessThemeDto)
  theme?: BusinessThemeDto | null;
}

export class CreateFirstBranchDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  address!: string;
}

export class UpdateFirstBranchDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;
}
