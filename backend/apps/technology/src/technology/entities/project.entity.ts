import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { ProjectParticipant } from './project-participant.entity';
import { ProjectProposal } from './project-proposal.entity';
import { ProjectTask } from './project-task.entity';
import { ProjectMessage } from './project-message.entity';
import { PaymentType } from '../enums/payment-type.enum';

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',        // Client submitted → waiting admin review
  ADMIN_REVIEW = 'admin_review',  // Admin is reviewing
  APPROVED = 'approved',          // Admin approved, waiting for payment
  PAYMENT_PENDING = 'payment_pending',
  ACTIVE = 'active',              // Payment done → public / available for business
  IN_PROGRESS = 'in_progress',   // Business accepted and working
  COMPLETED = 'completed',        // Business marked complete
  REVISION = 'revision',          // Client/Admin requested revision
  ACCEPTED = 'accepted',          // Client/Admin accepted → trigger payment release
  REJECTED = 'rejected',          // Admin rejected
}

export enum PaymentStatus {
  NONE = 'none',
  PENDING = 'pending',
  PAID = 'paid',            // Client paid into escrow
  RELEASED = 'released',   // Payment released to business
  REFUNDED = 'refunded',
}

@Entity('projects')
@Index(['projectId'], { unique: true })
@Index(['status'])
@Index(['createdBy'])
@Index(['submissionStatus'])
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.DRAFT,
  })
  submissionStatus: SubmissionStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.NONE,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  // Who created the project (client userId)
  @Column({ type: 'varchar', length: 255, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updatedBy: string;

  // Original budget submitted by client
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  // Admin-set approved budget
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  adminBudget: number;

  // Admin-set minimum budget
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minBudget: number;

  // Admin commission % (default 10%)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  commissionPercent: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subcategory: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  projectType: string;

  @Column({
    type: 'enum',
    enum: PaymentType,
    enumName: 'PaymentType',
    nullable: true,
  })
  paymentType: PaymentType;

  @Column({ type: 'varchar', length: 50, default: 'one_time' })
  paymentTerms: string; // 'one_time' | 'milestone'

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  milestones: { id: string; title: string; amount: number; status: string }[];

  @Column({ type: 'simple-array', nullable: true })
  skills: string[];

  // Admin review fields
  @Column({ type: 'text', nullable: true })
  requirements: string;

  @Column({ type: 'text', nullable: true })
  conditions: string;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  // Business that accepted the project
  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedBusinessId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedBusinessName: string;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  // Completion fields
  @Column({ type: 'simple-array', nullable: true })
  deliverableUrls: string[];

  @Column({ type: 'jsonb', nullable: true, default: () => "'[]'" })
  deliverableFiles: { name: string; url: string; size?: number; type?: string; uploadedAt?: string }[];

  @Column({ type: 'text', nullable: true })
  completionNotes: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  // Payment timestamps
  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paymentReleasedAt: Date;

  @Column({ type: 'int', nullable: true })
  acceptedProposalId: number;

  @OneToMany(() => ProjectProposal, (proposal) => proposal.project)
  proposals: ProjectProposal[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ProjectParticipant, (participant) => participant.project)
  participants: ProjectParticipant[];

  @OneToMany(() => ProjectTask, (task) => task.project)
  tasks: ProjectTask[];

  @OneToMany(() => ProjectMessage, (message) => message.project)
  messages: ProjectMessage[];

  @BeforeInsert()
  async generateProjectId() {
    if (!this.projectId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      this.projectId = `PROJ-${timestamp}-${random}`.toUpperCase();
    }
  }
}
