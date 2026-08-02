import {
  IsIn,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class TokenRequestDto {
  @IsString()
  @IsIn(['password', 'refresh_token'])
  grant_type: 'password' | 'refresh_token';

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  client_secret?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  // Password grant specific
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  otp?: string;

  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  device_name?: string;

  @IsOptional()
  @IsString()
  login_role?: string;

  // Refresh grant specific
  @IsOptional()
  @IsString()
  refresh_token?: string;

}


