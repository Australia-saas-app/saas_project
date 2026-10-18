import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum PledgeStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('investment_pledges')
export class InvestmentPledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  pledgeId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  campaignId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  investorUserId: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  investorName: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  investorEmail: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 6, scale: 3, default: 0 })
  equitySharePercent: number;

  @Index()
  @Column({ type: 'varchar', length: 32, default: PledgeStatus.CONFIRMED })
  status: PledgeStatus;

  @Column({ type: 'varchar', length: 64, default: 'wallet' })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  transactionId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalDividendsPaid: number;

  @CreateDateColumn()
  createdAt: Date;
}
