import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreatePledgeDto {
  @IsNotEmpty()
  @IsString()
  campaignId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(10)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
