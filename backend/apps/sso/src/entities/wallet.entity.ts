import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';

@Index(['userId'], { unique: true })
@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // FK → users.userId (ULID / varchar)
  @Column({ type: 'varchar', length: 26, nullable: true })
  userId: string | null;

  @OneToOne(() => User, {
    nullable: true,
    onDelete: 'CASCADE', // deleting user deletes wallet
  })
  @JoinColumn({
    name: 'userId',
    referencedColumnName: 'userId',
  })
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  availableBalance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionRate: number; // e.g., 0.10 for 10%

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  pendingBalance: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];
}
