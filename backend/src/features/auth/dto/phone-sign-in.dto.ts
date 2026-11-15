import { IsString, IsDefined } from 'class-validator';

export class PhoneSignInDto {
  @IsDefined()
  @IsString()
  phoneNumber!: string;
}