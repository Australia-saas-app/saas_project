import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  isAdminOverride?: boolean;
}
