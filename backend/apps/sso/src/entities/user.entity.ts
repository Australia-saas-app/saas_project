import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ulid } from 'ulidx';

// Minimal UUIDv7 generator compatible with CommonJS (Node 18)
// Generates 16 random bytes, then sets version (7) and variant bits.
function generateUuidV7(): string {
  const bytes = randomBytes(16);

  // Set version to 7 (UUIDv7)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // Set variant to RFC 4122 (10xx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`;
}

export enum AccountType {
  USER = 'user',
  AGENCY = 'agency',
  BUSINESS = 'business',
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
  DORMANT = 'dormant',
  CLOSED = 'closed',
}

export enum BusinessType {
  TECHNOLOGY = 'Technology',
  CONSTRUCTION = 'Construction',
  REAL_ESTATE = 'Real Estate',
  COMMERCIAL_INDUSTRIAL = 'Commercial & Industrial',
  VISA_TRAVEL = 'Visa & Travel',
  EDUCATION = 'Education',
  CAREERS = 'Careers',
  HEALTHCARE = 'Healthcare',
  MARKETPLACE = 'Marketplace',
  INVESTMENT = 'Investment',
  DONATIONS = 'Donations',
  IMPORT_EXPORT = 'Import & Export',
  SOLUTIONS = 'Solutions',
}

export enum EmployeeRange {
  RANGE_01_30 = '01-30',
  RANGE_30_70 = '30-70',
  RANGE_70_150 = '70-150',
  RANGE_150_300 = '150-300',
  RANGE_300_500 = '300-500',
  RANGE_500_700 = '500-700',
  RANGE_700_1000_PLUS = '700-1000+',
}

export enum ContactInfoStatus {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum TwoFactorMethod {
  EMAIL = 'email',
  PHONE = 'phone',
}

export enum KycStatus {
  NONE = 'none',
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true })
@Index(['userId'], { unique: true })
@Index(['accountType'])
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 26, unique: true, nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.USER,
  })
  accountType: AccountType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  recoveryKey: string;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  profilePhoto: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  passportNumber: string;

  @Column({ type: 'jsonb', nullable: true })
  permanentAddress: {
    country: string;
    city: string;
    state: string;
    zipCode: string;
    address: string;
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  governmentId: string;

  @Column({ type: 'text', nullable: true })
  idDocument: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.NONE,
  })
  kycStatus: KycStatus;

  @Column({ type: 'jsonb', nullable: true })
  statusHistory: {
    status: UserStatus;
    reason?: string;
    changedBy?: string;
    changedAt: string;
  }[] | null;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({
    type: 'enum',
    enum: TwoFactorMethod,
    nullable: true,
  })
  twoFactorMethod: TwoFactorMethod;

  @Column({ type: 'jsonb', nullable: true })
  preferences: {
    theme?: 'light' | 'dark';
    language?: string;
    notifications?: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  agencyInfo: {
    agencyLogo: string;
    agencyName: string;
    businessType: BusinessType;
    serviceArea: {
      country: string;
      state: string;
    };
    grade: string;
    supportedLanguages: string[];
    employeeRange: EmployeeRange;
    businessRegistrationNumber: string;
    taxIdentificationNumber: string;
    officeAddress: {
      country: string;
      state: string;
      city: string;
      zipCode: string;
      address: string;
    };
    businessRegistrationCertificate: string;
    taxVatCertificate: string;
    ag64Form: string;
    descriptionOfServices: string;
    annualFee: number;
    securityDeposit: number;
    totalDepositBalance: number;
    totalDueDeposit: number;
    totalPenaltyFee: number;
    renewalFee: number;
    renewalDate: Date;
    establishmentDate: Date;
    ranking: number;
    contactInfoStatus: ContactInfoStatus;
  };

  @Column({ type: 'jsonb', nullable: true })
  businessInfo: {
    businessName: string;
    businessIndustry: string;
    businessLogo: string;
    category: string[];
    subcategory: string[];
    requiredSkills: string[];
    serviceArea: {
      country: string;
      state: string;
      city: string;
    };
    supportedLanguages: string[];
    employeeRange: EmployeeRange;
    businessRegistrationNumber: string;
    taxIdentificationNumber: string;
    officeAddress: {
      country: string;
      state: string;
      city: string;
      zipCode: string;
      address: string;
    };
    businessRegistrationCertificate: string;
    taxVatCertificate: string;
    ag64Form: string;
    descriptionOfServices: string;
  };

  // --- Flattened Metrics & Stats (Used by Admin Dashboard) ---
  
  // User metrics
  @Column({ type: 'int', default: 0 })
  totalProject: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  dueAmount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  profit: number;

  // Business metrics
  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  securityDeposit: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  percentageRate: number;

  @Column({ type: 'varchar', length: 255, default: 'NA' })
  businessName: string;

  @Column({ type: 'varchar', length: 255, default: 'NA' })
  businessType: string;

  // Affiliate metrics
  @Column({ type: 'int', default: 0 })
  conversions: number;

  @Column({ type: 'int', default: 0 })
  referrals: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  commission: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  earnings: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'varchar', length: 255, default: 'NA' })
  industryType: string;


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  assignIds() {
    if (!this.id) {
      // Internal ID: UUIDv7 (version 7)
      this.id = generateUuidV7();
    }
    if (!this.userId) {
      this.userId = ulid();
    }
    if (!this.status) {
      this.status = UserStatus.SUSPENDED;
    }
  }
  
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}
