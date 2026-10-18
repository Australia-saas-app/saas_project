import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('investment_dividends')
export class InvestmentDividend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  dividendId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  campaignId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  investorUserId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  pledgeId: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  roiRate: number;

  @Column({ type: 'varchar', length: 32, default: 'DISTRIBUTED' })
  status: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  transactionId: string;

  @CreateDateColumn()
  distributedAt: Date;
}
