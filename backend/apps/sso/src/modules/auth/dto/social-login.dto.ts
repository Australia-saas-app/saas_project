import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';

export class SocialLoginDto {
  @IsString()
  @IsIn(['google', 'apple', 'linkedin', 'github'])
  provider: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  accountType?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  idToken?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;
}
