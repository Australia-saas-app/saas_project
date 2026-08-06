import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Stores KYC application snapshots separately from the user table.
 * The user table already has ~1600 columns (PostgreSQL hard limit),
 * so we cannot add more columns to it. This separate table is lightweight
 * and can always be extended without hitting the 1600 column limit.
 */
@Entity('kyc_application')
export class KycApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', unique: true })
  userId: string;

  @Column({ type: 'jsonb', nullable: true })
  applicationData: {
    fullName?: string;
    email?: string;
    nationality?: string;
    governmentId?: string;
    governmentIdType?: string;
    dateOfBirth?: string;
    permanentAddress?: {
      country?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      address?: string;
    };
    idDocument?: string;
    avatarUrl?: string;
    appliedAt?: string;
    resubmittedAt?: string;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
