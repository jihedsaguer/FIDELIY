import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class JoinBusinessDto {
  @IsOptional()
  @IsUUID()
  businessQrId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  branchQrId?: string;
}
