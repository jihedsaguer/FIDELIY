import { IsString, Matches } from 'class-validator';

export class ResolveCustomerQrDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  credential!: string;
}
