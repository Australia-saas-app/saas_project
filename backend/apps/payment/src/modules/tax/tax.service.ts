import { Injectable } from '@nestjs/common';

export interface TaxCalculationResult {
  subtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  country: string;
  taxName: string;
  isB2bExempt: boolean;
  exemptionReason?: string;
}

@Injectable()
export class TaxService {
  // Jurisdiction standard tax rates
  private readonly defaultRates: Record<string, { rate: number; name: string }> = {
    AU: { rate: 10.0, name: 'AU GST' },
    NZ: { rate: 15.0, name: 'NZ GST' },
    GB: { rate: 20.0, name: 'UK VAT' },
    UK: { rate: 20.0, name: 'UK VAT' },
    DE: { rate: 19.0, name: 'EU VAT' },
    FR: { rate: 20.0, name: 'EU VAT' },
    ES: { rate: 21.0, name: 'EU VAT' },
    IT: { rate: 22.0, name: 'EU VAT' },
    NL: { rate: 21.0, name: 'EU VAT' },
    CA: { rate: 5.0, name: 'CA GST' },
    US: { rate: 0.0, name: 'US Sales Tax' }, // Digital services interstate 0%
  };

  /**
   * Calculate applicable tax for an order / milestone / service payment
   */
  calculateTax(options: {
    subtotal: number;
    country?: string;
    currency?: string;
    taxIdNumber?: string;
    isB2bExempt?: boolean;
  }): TaxCalculationResult {
    const subtotal = Math.max(0, Number(options.subtotal) || 0);
    const country = (options.country || 'AU').toUpperCase();
    const currency = (options.currency || 'USD').toUpperCase();

    // Check B2B exemption
    const hasValidTaxId = Boolean(options.taxIdNumber && options.taxIdNumber.trim().length >= 5);
    const isExempt = Boolean(options.isB2bExempt || hasValidTaxId);

    if (isExempt) {
      return {
        subtotal,
        taxRatePercent: 0,
        taxAmount: 0,
        totalAmount: Number(subtotal.toFixed(2)),
        currency,
        country,
        taxName: 'Reverse Charge / Tax Exempt',
        isB2bExempt: true,
        exemptionReason: hasValidTaxId ? `Valid Tax/ABN ID: ${options.taxIdNumber}` : 'B2B Exemption applied',
      };
    }

    const jurisdiction = this.defaultRates[country] || { rate: 10.0, name: 'Standard GST' };
    const taxRatePercent = jurisdiction.rate;
    const taxAmount = Number(((subtotal * taxRatePercent) / 100).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    return {
      subtotal,
      taxRatePercent,
      taxAmount,
      totalAmount,
      currency,
      country,
      taxName: jurisdiction.name,
      isB2bExempt: false,
    };
  }

  /**
   * Get all supported tax rates
   */
  getSupportedRates() {
    return {
      success: true,
      data: this.defaultRates,
    };
  }
}
