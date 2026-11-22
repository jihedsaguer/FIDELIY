import { IsString, Matches } from 'class-validator';

export class ResolveCustomerQrDto {
  @IsString()
  // Full credential (43 chars) or short ID (XXXXX-XXXXX, any case/spacing).
  @Matches(/^(?:[A-Za-z0-9_-]{43}|[A-Za-z0-9 -]{10,14})$/)
  credential!: string;
}
