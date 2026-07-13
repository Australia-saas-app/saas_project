import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  role: string; // 'user' | 'affiliate' | 'business'

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ default: 'PENDING' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // --- User Specific ---
  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: 0 })
  totalProject: number;

  @Column({ default: 0 })
  totalAmount: number;

  @Column({ default: 0 })
  refundAmount: number;

  @Column({ default: 0 })
  profit: number;

  // --- Affiliate Specific ---
  @Column({ default: 'NA' })
  industryType: string;

  @Column({ default: 0 })
  conversions: number;

  @Column({ default: 0 })
  referrals: number;

  @Column({ default: 0 })
  commission: number;

  @Column({ default: 0 })
  earnings: number;

  @Column({ default: 1 })
  level: number;

  // --- Business Specific ---
  @Column({ nullable: true })
  businessName: string;

  @Column({ default: 'NA' })
  businessType: string;

  @Column({ default: 0 })
  securityDeposit: number;

  @Column({ default: 0 })
  dueAmount: number;

  @Column({ default: 0 })
  percentageRate: number;

  @Column({ default: 0 })
  paidAmount: number;
}
