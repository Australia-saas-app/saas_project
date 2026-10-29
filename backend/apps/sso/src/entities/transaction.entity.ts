import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
  PAYMENT = 'payment',
  CHARGEBACK = 'chargeback',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('transactions')
@Index(['walletId'])
@Index(['transactionId'], { unique: true })
@Index(['userId'])
@Index(['status'])
@Index(['type'])
@Index(['createdAt'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  transactionId: string;
  // FK → users.userId (ULID / varchar)
  @Column({ type: 'varchar', length: 26, nullable: true })
  userId: string | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL', // keeps transaction history safe
  })
  @JoinColumn({
    name: 'userId',
    referencedColumnName: 'userId',
  })
  user: User;

  // FK → wallets.id (UUID)
  @Column({ type: 'uuid', nullable: true })
  walletId: string | null;

  @ManyToOne(() => Wallet, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet | null;

  @Column({
    type: 'enum',
    enum: TransactionType,
    enumName: 'transaction_type_enum',
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    enumName: 'transaction_status_enum',
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'text', nullable: true })
  description?: string;
  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentMethod: string; // 'card', 'wallet', 'bank_transfer', etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentProvider: string; // 'stripe', 'paypal', etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentProviderTransactionId: string;

  @Column({ type: 'int', nullable: true })
  paymentCardId: number; // Reference to payment card if used

  @Column({ type: 'varchar', length: 50, nullable: true })
  referenceId: string; // Reference to order/service that triggered this transaction

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  balanceAfter: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
