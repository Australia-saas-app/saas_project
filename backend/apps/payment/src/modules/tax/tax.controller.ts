import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { TaxService } from './tax.service';

@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  calculateTax(
    @Body()
    body: {
      subtotal: number;
      country?: string;
      currency?: string;
      taxIdNumber?: string;
      isB2bExempt?: boolean;
    },
  ) {
    const result = this.taxService.calculateTax(body);
    return {
      success: true,
      data: result,
    };
  }

  @Get('rates')
  @HttpCode(HttpStatus.OK)
  getRates() {
    return this.taxService.getSupportedRates();
  }
}
