export type CampaignCategory =
  | "ALL"
  | "Renewable Energy"
  | "Maritime & Shipping"
  | "FinTech & AI"
  | "Commercial Real Estate"
  | "Healthcare"
  | "AgriTech";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH_GROWTH";

export interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  businessName: string;
  businessId?: string;
  targetAmount: number;
  raisedAmount: number;
  minInvestment: number;
  currency: string;
  expectedRoiPercent: number;
  equityPercent: number;
  termMonths: number;
  riskLevel: RiskLevel;
  investorCount: number;
  status: "DRAFT" | "ACTIVE" | "FUNDED" | "CLOSED";
  imageUrl?: string;
  highlights?: string[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface Pledge {
  id: string;
  campaignId: string;
  campaignTitle?: string;
  investorUserId: string;
  amount: number;
  currency: string;
  equitySharePercent: number;
  expectedAnnualReturn: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  paymentMethod: "WALLET" | "STRIPE" | "BANK_TRANSFER";
  transactionId?: string;
  createdAt: string;
  campaign?: Campaign;
}

export interface PlatformInvestmentStats {
  totalCapitalDeployed: number;
  activeCampaignsCount: number;
  averageRoiPercent: number;
  totalInvestorsCount: number;
}
