import { IsString, IsOptional, IsEnum, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '../../../entities/user.entity';

class PermanentAddressDto {
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() zipCode?: string;
  @IsOptional() @IsString() address?: string;
}

class AgencyServiceAreaDto {
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() state?: string;
}

export class CompleteProfileDto {
  @IsEnum(AccountType)
  accountType: AccountType;

  // Common
  @IsOptional() @IsString() profilePhoto?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @ValidateNested() @Type(() => PermanentAddressDto) permanentAddress?: PermanentAddressDto;
  @IsOptional() @IsString() governmentId?: string;
  @IsOptional() @IsString() idDocument?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() currency?: string;

  // Business specific
  @IsOptional() @IsString() passportNumber?: string;

  // Agency specific
  @IsOptional() @ValidateNested() @Type(() => AgencyServiceAreaDto) serviceArea?: AgencyServiceAreaDto;
  @IsOptional() @IsString() agencyName?: string;
}


