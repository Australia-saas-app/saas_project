import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { KycStatus } from '../../../entities/user.entity';

export class UpdateKycStatusDto {
  @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase() : value)
  @IsEnum(KycStatus)
  kycStatus: KycStatus;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  rejectionReasons?: {
    documentsNotVerified?: boolean;
    livenessNotVerified?: boolean;
    personalData?: boolean;
    personalDataDetails?: string;
  };
}
