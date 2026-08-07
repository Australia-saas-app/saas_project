import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

export enum AccountType {
  USER = 'user',
  AFFILIATE = 'affiliate',
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

export enum BusinessIndustry {
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
}

export enum Grade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
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

@Entity('users')
@Index(['email'])
@Index(['phone'])
@Index(['userId'], { unique: true })
@Index(['accountType'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.USER,
  })
  accountType: AccountType;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

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

  // Agency-specific fields
  @Column({ type: 'jsonb', nullable: true })
  agencyInfo: {
    agencyLogo: string;
    agencyName: string;
    businessType: BusinessType;
    serviceArea: {
      country: string;
      state: string;
    };
    grade: Grade;
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

  // Business-specific fields
  @Column({ type: 'jsonb', nullable: true })
  businessInfo: {
    businessName: string;
    businessIndustry: BusinessIndustry;
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  async setDefaults() {
    if (!this.status) {
      // New accounts start as suspended until profile verification
      this.status = UserStatus.SUSPENDED;
    }
    // Password should be hashed in service layer before saving
    // This hook will only hash if password is plain text (not already hashed)
    // Password hashing is handled in AuthService to avoid double-hashing
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

