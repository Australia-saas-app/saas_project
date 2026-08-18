import { IsString, IsNumber, IsOptional } from 'class-validator';

export class ApplyProjectDto {
  @IsString()
  @IsOptional()
  proposal?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  timeline?: string;

  @IsOptional()
  paymentType?: any;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  userName?: string;
}
