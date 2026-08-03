import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class ResetPasswordDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  recoveryKey?: string;

  @IsOptional()
  @IsString()
  otp?: string;

  @IsString()
  @MinLength(6)
  newPassword: string;

  @IsOptional()
  @IsString()
  accountType?: string;
}


