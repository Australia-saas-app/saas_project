import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PenaltyStatus {
  ACTIVE = 'Active',
  RESOLVED = 'Resolved',
  WAIVED = 'Waived',
}

@Entity('penalty_records')
@Index(['userId'])
@Index(['status'])
export class PenaltyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  penaltyId: string;

  @Column({ type: 'varchar', length: 100 })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessUserId: string;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PenaltyStatus,
    default: PenaltyStatus.ACTIVE,
  })
  status: PenaltyStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paidTransactionId: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
