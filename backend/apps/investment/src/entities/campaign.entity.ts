import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  FUNDED = 'FUNDED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum RiskLevel {
  LOW = 'Low',
  MODERATE = 'Moderate',
  HIGH = 'High',
}

@Entity('investment_campaigns')
export class InvestmentCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  campaignId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  businessUserId: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  businessName: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  tagline: string;

  @Index()
  @Column({ type: 'varchar', length: 64, default: 'Technology' })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  targetAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  raisedAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 100 })
  minInvestment: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  maxInvestment: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 12.5 })
  expectedRoiPercent: number;

  @Column({ type: 'int', default: 12 })
  termMonths: number;

  @Column({ type: 'varchar', length: 32, default: RiskLevel.MODERATE })
  riskLevel: RiskLevel;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  equityPercent: number;

  @Column({ type: 'int', default: 0 })
  investorCount: number;

  @Index()
  @Column({ type: 'varchar', length: 32, default: CampaignStatus.ACTIVE })
  status: CampaignStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bannerUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pitchDeckUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
