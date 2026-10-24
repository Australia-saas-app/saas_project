export const PAYMENT_METHOD_OPTIONS = [
  "PayPal",
  "Bank Transfer",
  "Stripe",
  "Wise",
  "Payoneer",
  "Credit / Debit Card",
] as const

/** Methods that can receive platform payouts / withdrawals. Cards are pay-in only. */
export const WITHDRAWAL_METHOD_TYPES = [
  "PayPal",
  "Bank Transfer",
  "Stripe",
  "Wise",
  "Payoneer",
] as const

export type WithdrawalMethodType = (typeof WITHDRAWAL_METHOD_TYPES)[number]

export type PaymentMethodType = (typeof PAYMENT_METHOD_OPTIONS)[number]

export interface PaymentFieldConfig {
  key: string
  label: string
  placeholder?: string
  type?: "text" | "email" | "select" | "month"
  options?: string[]
  required?: boolean
  maxLength?: number
  pattern?: RegExp
  helpText?: string
}

export const PAYMENT_METHOD_FIELDS: Record<PaymentMethodType, PaymentFieldConfig[]> = {
  PayPal: [
    { key: "paypalEmail", label: "PayPal email", type: "email", placeholder: "you@email.com", required: true },
    { key: "accountName", label: "Account holder name", placeholder: "Full legal name", required: true },
    { key: "country", label: "Country", type: "select", options: ["United States", "Canada", "United Kingdom", "Australia", "Other"], required: true },
  ],
  "Bank Transfer": [
    { key: "accountName", label: "Account holder name", placeholder: "Full legal name", required: true },
    { key: "bankName", label: "Bank name", placeholder: "e.g. Chase Bank", required: true },
    { key: "accountNumber", label: "Account number", placeholder: "Account number", required: true },
    { key: "routingNumber", label: "Routing / SWIFT / IBAN", placeholder: "Routing, SWIFT, or IBAN", required: true },
    { key: "country", label: "Bank country", type: "select", options: ["United States", "Canada", "United Kingdom", "European Union", "Other"], required: true },
    { key: "currency", label: "Payout currency", type: "select", options: ["USD", "EUR", "GBP", "CAD", "AUD"], required: true },
  ],
  Stripe: [
    { key: "stripeEmail", label: "Stripe account email", type: "email", placeholder: "billing@company.com", required: true },
    { key: "accountName", label: "Business / account name", placeholder: "Registered business name", required: true },
    { key: "stripeAccountId", label: "Stripe Connect account ID (optional)", placeholder: "acct_xxxxxxxx", helpText: "If you already connected Stripe, paste your account ID." },
  ],
  Wise: [
    { key: "wiseEmail", label: "Wise account email", type: "email", placeholder: "you@email.com", required: true },
    { key: "recipientName", label: "Recipient name", placeholder: "Name on Wise account", required: true },
    { key: "wiseTag", label: "Wise tag / username (optional)", placeholder: "@yourtag" },
    { key: "currency", label: "Preferred currency", type: "select", options: ["USD", "EUR", "GBP", "CAD", "AUD", "INR"], required: true },
    { key: "country", label: "Country", type: "select", options: ["United States", "Canada", "United Kingdom", "European Union", "Australia", "Other"], required: true },
  ],
  Payoneer: [
    { key: "payoneerEmail", label: "Payoneer email", type: "email", placeholder: "you@email.com", required: true },
    { key: "accountName", label: "Account holder name", placeholder: "Full legal name", required: true },
    { key: "payoneerId", label: "Payoneer customer ID (optional)", placeholder: "Customer ID from Payoneer dashboard" },
    { key: "country", label: "Country", type: "select", options: ["United States", "Canada", "United Kingdom", "European Union", "Other"], required: true },
  ],
  "Credit / Debit Card": [
    { key: "cardholderName", label: "Cardholder name", placeholder: "Name on card", required: true },
    { key: "cardNumber", label: "Card number", placeholder: "1234 5678 9012 3456", required: true, maxLength: 19 },
    { key: "expiry", label: "Expiry date", type: "month", required: true },
    { key: "cvc", label: "Security code (CVC / CVV)", placeholder: "123", required: true, maxLength: 4 },
    { key: "billingCountry", label: "Billing country", type: "select", options: ["United States", "Canada", "United Kingdom", "European Union", "Australia", "Other"], required: true },
    { key: "billingZip", label: "Billing ZIP / postal code", placeholder: "ZIP or postal code", required: true },
  ],
}

export function buildPaymentMethodSummary(type: PaymentMethodType, details: Record<string, string>): string {
  switch (type) {
    case "PayPal":
      return details.paypalEmail || "PayPal account"
    case "Bank Transfer":
      return details.bankName
        ? `${details.bankName}${details.accountNumber ? ` · ••••${details.accountNumber.slice(-4)}` : ""}`
        : "Bank account"
    case "Stripe":
      return details.stripeEmail || details.stripeAccountId || "Stripe account"
    case "Wise":
      return details.wiseEmail
        ? `${details.wiseEmail}${details.currency ? ` (${details.currency})` : ""}`
        : "Wise account"
    case "Payoneer":
      return details.payoneerEmail || "Payoneer account"
    case "Credit / Debit Card": {
      const digits = (details.cardNumber || "").replace(/\D/g, "")
      const last4 = digits.slice(-4)
      return last4 ? `Card ending ${last4}` : "Debit / credit card"
    }
    default:
      return type
  }
}

export function buildDefaultLabel(type: PaymentMethodType, details: Record<string, string>): string {
  const summary = buildPaymentMethodSummary(type, details)
  return summary === type ? `My ${type}` : `${type} — ${summary}`
}

export function validatePaymentDetails(type: PaymentMethodType, details: Record<string, string>): string | null {
  const fields = PAYMENT_METHOD_FIELDS[type]
  for (const field of fields) {
    const value = (details[field.key] || "").trim()
    if (field.required && !value) {
      return `${field.label} is required.`
    }
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `Enter a valid ${field.label.toLowerCase()}.`
    }
  }
  if (type === "Credit / Debit Card") {
    const digits = (details.cardNumber || "").replace(/\D/g, "")
    if (digits.length < 13 || digits.length > 19) {
      return "Enter a valid card number."
    }
    const cvc = (details.cvc || "").trim()
    if (!cvc || cvc.length < 3 || cvc.length > 4) {
      return "Enter a valid 3 or 4-digit security code (CVC / CVV)."
    }
  }
  return null
}

export function sanitizePaymentDetails(type: PaymentMethodType, details: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {}
  for (const field of PAYMENT_METHOD_FIELDS[type]) {
    let value = (details[field.key] || "").trim()
    if (field.key === "cardNumber") {
      const digits = value.replace(/\D/g, "")
      sanitized.cardLast4 = digits.slice(-4)
      sanitized.cardNumber = `•••• •••• •••• ${digits.slice(-4)}`
      continue
    }
    if (field.key === "cvc") {
      sanitized.cvc = "•••"
      continue
    }
    sanitized[field.key] = value
  }
  return sanitized
}
