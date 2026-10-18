import { IsNotEmpty, IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { RiskLevel } from '../../../entities/campaign.entity';

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  targetAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  minInvestment?: number;

  @IsOptional()
  @IsNumber()
  maxInvestment?: number;

  @IsOptional()
  @IsNumber()
  expectedRoiPercent?: number;

  @IsOptional()
  @IsNumber()
  termMonths?: number;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsNumber()
  equityPercent?: number;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  pitchDeckUrl?: string;

  @IsOptional()
  @IsString()
  businessName?: string;
}
