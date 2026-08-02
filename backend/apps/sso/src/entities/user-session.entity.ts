import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { OAuthClient } from './oauth-client.entity';

@Entity('user_sessions')
@Index(['user', 'active'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => OAuthClient, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  client?: OAuthClient;

  @Column({ name: 'device_id', type: 'varchar', length: 128, nullable: true })
  deviceId?: string;

  @Column({ name: 'login_role', type: 'varchar', length: 50, nullable: true })
  loginRole?: string;

  @Column({ name: 'device_name', type: 'varchar', length: 255, nullable: true })
  deviceName?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'location', type: 'jsonb', nullable: true })
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  @Column({ name: 'risk_score', type: 'integer', default: 0 })
  riskScore: number;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'terminated_at', type: 'timestamptz', nullable: true })
  terminatedAt?: Date;

  @Column({ name: 'termination_reason', type: 'text', nullable: true })
  terminationReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


