import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '../../../entities/user.entity';

export class PermanentAddressDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class AgencyServiceAreaDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class AgencyInfoDto {
  @IsOptional()
  @IsString()
  agencyLogo?: string;

  @IsString()
  agencyName: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AgencyServiceAreaDto)
  serviceArea?: AgencyServiceAreaDto;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString({ each: true })
  supportedLanguages?: string[];

  @IsOptional()
  @IsString()
  employeeRange?: string;

  @IsOptional()
  @IsString()
  businessRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  taxIdentificationNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PermanentAddressDto)
  officeAddress?: PermanentAddressDto;

  @IsOptional()
  @IsString()
  businessRegistrationCertificate?: string;

  @IsOptional()
  @IsString()
  taxVatCertificate?: string;

  @IsOptional()
  @IsString()
  ag64Form?: string;

  @IsOptional()
  @IsString()
  descriptionOfServices?: string;
}

export class BusinessServiceAreaDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class BusinessInfoDto {
  @IsString()
  businessName: string;

  @IsOptional()
  @IsString()
  businessIndustry?: string;

  @IsOptional()
  @IsString()
  businessLogo?: string;

  @IsOptional()
  @IsString({ each: true })
  category?: string[];

  @IsOptional()
  @IsString({ each: true })
  subcategory?: string[];

  @IsOptional()
  @IsString({ each: true })
  requiredSkills?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessServiceAreaDto)
  serviceArea?: BusinessServiceAreaDto;

  @IsOptional()
  @IsString({ each: true })
  supportedLanguages?: string[];

  @IsOptional()
  @IsString()
  employeeRange?: string;

  @IsOptional()
  @IsString()
  businessRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  taxIdentificationNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PermanentAddressDto)
  officeAddress?: PermanentAddressDto;

  @IsOptional()
  @IsString()
  businessRegistrationCertificate?: string;

  @IsOptional()
  @IsString()
  taxVatCertificate?: string;

  @IsOptional()
  @IsString()
  ag64Form?: string;

  @IsOptional()
  @IsString()
  descriptionOfServices?: string;
}

export class RegisterDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  otp?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(AccountType)
  accountType: AccountType;

  @IsOptional()
  @IsString()
  profilePhoto?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  passportNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PermanentAddressDto)
  permanentAddress?: PermanentAddressDto;

  @IsOptional()
  @IsString()
  governmentId?: string;

  @IsOptional()
  @IsString()
  idDocument?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AgencyInfoDto)
  agencyInfo?: AgencyInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessInfoDto)
  businessInfo?: BusinessInfoDto;

  @IsOptional()
  @IsString()
  recoveryKey?: string;
}


