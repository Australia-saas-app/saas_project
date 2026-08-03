import { IsEmail, IsOptional, IsString } from 'class-validator';

export class VerifyPasswordDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  accountType?: string;
}






