import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../../entities/user.entity';

export class UpdateKycStatusDto {
  @IsEnum(KycStatus)
  kycStatus: KycStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
