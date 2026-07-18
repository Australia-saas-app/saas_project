import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DeepPartial } from 'typeorm';
import { QueryFailedError } from 'typeorm/error/QueryFailedError';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { OtpUtil } from '../../common/utils/otp.util';
import {
  AccountType,
  User,
  UserStatus,
  TwoFactorMethod,
} from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { VerifyContactOtpDto } from './dto/verify-contact-otp.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { TokenService } from '../token/token.service';
import { TokenRequestDto } from '../token/dto/token-request.dto';
import { JwtService } from '../../common/services/jwt.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly otpUtil: OtpUtil,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
  ) { }

  private normalizeEmail(email?: string) {
    return email ? email.trim().toLowerCase() : undefined;
  }

  private normalizePhone(phone?: string) {
    return phone ? phone.trim() : undefined;
  }

  private async findUserByAnyId(idStr: string) {
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(idStr)) {
      return this.userRepository.findOne({ where: { id: idStr } });
    }
    return this.userRepository.findOne({ where: { userId: idStr } });
  }

  async adminLogin(loginDto: LoginDto) {
    const email = this.normalizeEmail(loginDto.email);
    const admin = await this.adminRepository.findOne({ where: { email } });

    if (!admin || !(await bcrypt.compare(loginDto.password, admin.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenResponse = this.jwtService.signAdminToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return {
      success: true,
      message: 'Admin login successful',
      token: tokenResponse.token,
      data: {
        adminId: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    };
  }

  async adminForgotPassword(dto: ForgotPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    if (!email) {
      throw new BadRequestException('Invalid email');
    }
    const admin = await this.adminRepository.findOne({ where: { email } });

    if (!admin) {
      // Don't leak existence
      return { success: true, message: 'If account exists, an OTP has been sent' };
    }

    const otp = this.otpUtil.generateOTP(6, email);
    const otpKey = `otp:${email}:admin_reset`;
    await this.otpUtil.storeOTP(this.redisClient, otpKey, otp);
    await this.otpUtil.sendOTPEmail(email as string, otp);

    return {
      success: true,
      message: 'If account exists, an OTP has been sent',
    };
  }

  async adminResetPassword(dto: ResetPasswordDto) {
    const email = this.normalizeEmail(dto.email);
    if (!email) {
      throw new BadRequestException('Invalid email');
    }
    const otpKey = `otp:${email}:admin_reset`;
    
    const isValid = await this.otpUtil.verifyOTP(this.redisClient, otpKey, dto.otp as string);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const admin = await this.adminRepository.findOne({ where: { email } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.adminRepository.update(admin.id, {
      password: newHashedPassword
    });

    return {
      success: true,
      message: 'Admin password reset successfully',
    };
  }


  async register(registerDto: RegisterDto) {
    const normalizedEmail = this.normalizeEmail(registerDto.email);
    const normalizedPhone = this.normalizePhone(registerDto.phone);
    const accountType = registerDto.accountType || AccountType.USER;

    if (!registerDto.fullName || !registerDto.password || !normalizedEmail) {
      throw new BadRequestException(
        'Missing required fields: fullName, password, and email are required',
      );
    }

    if (registerDto.dateOfBirth) {
      const birthDate = new Date(registerDto.dateOfBirth);
      const today = new Date();
      const age = Math.floor(
        (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );
      if (accountType === AccountType.AGENCY && age < 16) {
        throw new BadRequestException(
          'Agency account requires minimum age of 16 years',
        );
      }
      if (accountType === AccountType.BUSINESS && age < 20) {
        throw new BadRequestException(
          'Business account requires minimum age of 20 years',
        );
      }
    }

    const duplicateConflicts: string[] = [];

    if (normalizedEmail) {
      const existingByEmail = await this.userRepository.findOne({
        where: { email: normalizedEmail, accountType: accountType, },
      });

      if (existingByEmail) {
        duplicateConflicts.push('email');
      }
    }

    if (normalizedPhone) {
      const existingByPhone = await this.userRepository.findOne({
        where: { phone: normalizedPhone },
      });

      if (existingByPhone) {
        duplicateConflicts.push('phone');
      }
    }

    if (duplicateConflicts.length) {
      throw new ConflictException(
        `An account with this ${duplicateConflicts.join(' and ')} already exists`,
      );
    }

    if (accountType === AccountType.AGENCY && registerDto.agencyInfo?.agencyName) {
      try {
        const existingAgency = await this.userRepository
          .createQueryBuilder('user')
          .where('user.accountType = :accountType', {
            accountType: AccountType.AGENCY,
          })
          .andWhere("user.agencyInfo ->> 'agencyName' = :agencyName", {
            agencyName: registerDto.agencyInfo.agencyName,
          })
          .getOne();
        if (existingAgency) {
          throw new ConflictException(
            'Agency name already exists. Must be unique.',
          );
        }
      } catch {
        // Ignore database-specific JSON errors and continue
      }
    }

    // Business info is collected during onboarding, no strict check here.

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    let initialStatus = UserStatus.PENDING;
    let emailVerified = !normalizedEmail;
    let phoneVerified = !normalizedPhone;

    if (registerDto.otp) {
      const otpKey = `otp:${normalizedEmail || normalizedPhone}:registration`;
      const isValid = await this.otpUtil.verifyOTP(this.redisClient, otpKey, registerDto.otp);
      if (!isValid) {
        throw new BadRequestException('Invalid or expired OTP provided');
      }
      emailVerified = !!normalizedEmail || emailVerified;
      phoneVerified = !!normalizedPhone || phoneVerified;
    }

    const user = this.userRepository.create({
      accountType,
      fullName: registerDto.fullName,
      email: normalizedEmail || null,
      phone: normalizedPhone || null,
      password: hashedPassword,
      currency: registerDto.currency || 'USD',
      profilePhoto: registerDto.profilePhoto,
      dateOfBirth: registerDto.dateOfBirth
        ? new Date(registerDto.dateOfBirth)
        : null,
      gender: registerDto.gender as any,
      nationality: registerDto.nationality,
      permanentAddress: registerDto.permanentAddress as any,
      governmentId: registerDto.governmentId,
      idDocument: registerDto.idDocument,
      passportNumber: registerDto.passportNumber,
      status: initialStatus,
      emailVerified,
      phoneVerified,
      recoveryKey: registerDto.recoveryKey?.trim() || null,
      statusHistory: [] as User['statusHistory'],
    } as DeepPartial<User>);

    if (accountType === AccountType.BUSINESS && registerDto.businessInfo) {
      (user as any).businessInfo = {
        ...registerDto.businessInfo,
      };
    }

    if (accountType === AccountType.AGENCY && registerDto.agencyInfo) {
      (user as any).agencyInfo = {
        ...registerDto.agencyInfo,
        annualFee: 0,
        securityDeposit: 0,
        totalDepositBalance: 0,
        totalDueDeposit: 0,
        totalPenaltyFee: 0,
        renewalFee: 0,
        ranking: 0,
        contactInfoStatus: 'public',
        establishmentDate: new Date(),
      };
    }

    let savedUser: User;
    try {
      savedUser = await this.userRepository.save(user as DeepPartial<User>);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any).code === '23505') {
        throw new ConflictException('Account already exists with this email');
      }
      throw error;
    }

    if (!registerDto.otp) {
      const otp = this.otpUtil.generateOTP(6, normalizedEmail || normalizedPhone);
      const otpKey = `otp:${normalizedEmail || normalizedPhone}:registration`;
      await this.otpUtil.storeOTP(this.redisClient, otpKey, otp);

      if (normalizedEmail) {
        await this.otpUtil.sendOTPEmail(normalizedEmail, otp);
      } else if (normalizedPhone) {
        await this.otpUtil.sendOTPSMS(normalizedPhone, otp);
      }
    }

    return {
      success: true,
      message: `${accountType
        .charAt(0)
        .toUpperCase()}${accountType.slice(1)} registered successfully${registerDto.otp ? '.' : '. Please verify OTP.'}`,
      data: {
        userId: savedUser.userId,
        accountType: savedUser.accountType,
        email: savedUser.email,
        phone: savedUser.phone,
        status: savedUser.status,
      },
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const normalizedEmail = this.normalizeEmail(verifyOtpDto.email);
    const normalizedPhone = this.normalizePhone(verifyOtpDto.phone);

    if (!verifyOtpDto.otp || (!normalizedEmail && !normalizedPhone)) {
      throw new BadRequestException(
        'Email or phone and OTP are required',
      );
    }

    const otpKey = `otp:${normalizedEmail || normalizedPhone}:registration`;
    const isValid = await this.otpUtil.verifyOTP(
      this.redisClient,
      otpKey,
      verifyOtpDto.otp,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const whereConditions: FindOptionsWhere<User>[] = [];
    if (normalizedEmail) whereConditions.push({ email: normalizedEmail });
    if (normalizedPhone) whereConditions.push({ phone: normalizedPhone });

    const user = whereConditions.length
      ? await this.userRepository.findOne({ where: whereConditions })
      : null;

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.emailVerified = normalizedEmail ? true : user.emailVerified;
    user.phoneVerified = normalizedPhone ? true : user.phoneVerified;
    // Removed auto-activation logic; accounts must be manually activated by Admin

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'OTP verified successfully',
      data: { userId: user.userId, activated: user.status === UserStatus.ACTIVE },
    };
  }

  async login(loginDto: LoginDto, req: Request) {
    const normalizedEmail = this.normalizeEmail(loginDto.email);
    const normalizedPhone = this.normalizePhone(loginDto.phone);

    if (!loginDto.password || (!normalizedEmail && !normalizedPhone)) {
      throw new BadRequestException(
        'Email or phone and password are required',
      );
    }

    if (loginDto.accountType) {
      const user = await this.userRepository.findOne({
        where: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      });

      if (user && user.accountType && user.accountType.toLowerCase() !== loginDto.accountType.toLowerCase()) {
        throw new ForbiddenException({
          success: false,
          error: 'ACCOUNT_TYPE_MISMATCH',
          message: `Account not found for the selected role. Please check the active tab.`,
        });
      }
    }

    const tokenRequest: TokenRequestDto = {
      grant_type: 'password',
      username: normalizedEmail || normalizedPhone,
      password: loginDto.password,
      otp: loginDto.otp,
      client_id:
        loginDto.clientId ||
        this.configService.get<string>('DEFAULT_CLIENT_ID', 'first-party-app'),
      client_secret:
        loginDto.clientSecret ||
        this.configService.get<string>(
          'DEFAULT_CLIENT_SECRET',
          'replace-me-in-production',
        ),
      scope:
        loginDto.scope ||
        this.configService.get<string>(
          'DEFAULT_SCOPE',
          'openid profile email offline_access',
        ),
      device_id: loginDto.deviceId,
      device_name: loginDto.deviceName,
    };

    try {
      const tokenResponse = await this.tokenService.handleTokenRequest(
        tokenRequest,
        req,
      );

      return {
        success: true,
        message: 'Login successful',
        data: {
          token: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresIn: tokenResponse.expires_in,
          tokenType: tokenResponse.token_type,
          scope: tokenResponse.scope,
          idToken: (tokenResponse as any).id_token ?? null,
          session: tokenResponse.session,
          user: tokenResponse.user,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        const response = error.getResponse() as Record<string, any>;
        if (response?.error === 'mfa_required') {
          return {
            success: true,
            message: 'OTP sent for 2FA verification',
            requires2FA: true,
            details: response,
          };
        }
        if (response?.error === 'invalid_otp') {
          throw new UnauthorizedException({
            success: false,
            message: 'Invalid or expired OTP',
            details: response,
          });
        }
        throw new UnauthorizedException({
          success: false,
          message: response?.error_description || 'Invalid credentials',
          details: response,
        });
      }
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new UnauthorizedException({
        success: false,
        message: 'Invalid credentials',
      });
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const normalizedEmail = this.normalizeEmail(forgotPasswordDto.email);
    const normalizedPhone = this.normalizePhone(forgotPasswordDto.phone);

    if (!normalizedEmail && !normalizedPhone) {
      throw new BadRequestException('Email or phone is required');
    }

    const whereConditions: FindOptionsWhere<User>[] = [];
    if (normalizedEmail) whereConditions.push({ email: normalizedEmail });
    if (normalizedPhone) whereConditions.push({ phone: normalizedPhone });

    const user = whereConditions.length
      ? await this.userRepository.findOne({ where: whereConditions })
      : null;

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = this.otpUtil.generateOTP(6, normalizedEmail || normalizedPhone);
    const otpKey = `otp:${normalizedEmail || normalizedPhone}:forgot-password`;
    await this.otpUtil.storeOTP(this.redisClient, otpKey, otp);

    if (normalizedEmail) {
      await this.otpUtil.sendOTPEmail(normalizedEmail, otp);
    } else if (normalizedPhone) {
      await this.otpUtil.sendOTPSMS(normalizedPhone, otp);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const normalizedEmail = this.normalizeEmail(resetPasswordDto.email);
    const normalizedPhone = this.normalizePhone(resetPasswordDto.phone);
    const { recoveryKey, otp, newPassword } = resetPasswordDto;

    if (!newPassword || (!recoveryKey && !otp) || (!normalizedEmail && !normalizedPhone && !recoveryKey)) {
      throw new BadRequestException(
        'Valid identifier and authentication method (OTP or Recovery Key) are required',
      );
    }

    if (!recoveryKey && otp) {
      const otpKey = `otp:${normalizedEmail || normalizedPhone}:forgot-password`;
      const isValid = await this.otpUtil.verifyOTP(
        this.redisClient,
        otpKey,
        otp,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid or expired OTP');
      }
    }

    const whereConditions: FindOptionsWhere<User>[] = [];
    if (recoveryKey && recoveryKey.trim()) whereConditions.push({ recoveryKey: recoveryKey.trim() });
    if (normalizedEmail) whereConditions.push({ email: normalizedEmail });
    if (normalizedPhone) whereConditions.push({ phone: normalizedPhone });

    const user = whereConditions.length
      ? await this.userRepository.findOne({ where: whereConditions })
      : null;

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newHashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    
    await this.userRepository.update(user.id, {
      password: newHashedPassword,
      twoFactorEnabled: false,
      twoFactorMethod: null as unknown as TwoFactorMethod,
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async sendOtp(email?: string, phone?: string, type = 'login') {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedPhone = this.normalizePhone(phone);

    if (!normalizedEmail && !normalizedPhone) {
      throw new BadRequestException('Email or phone is required');
    }

    const otp = this.otpUtil.generateOTP(6, normalizedEmail || normalizedPhone);
    const otpKey = `otp:${normalizedEmail || normalizedPhone}:${type}`;
    await this.otpUtil.storeOTP(this.redisClient, otpKey, otp);

    if (normalizedEmail) {
      await this.otpUtil.sendOTPEmail(normalizedEmail, otp);
    } else if (normalizedPhone) {
      await this.otpUtil.sendOTPSMS(normalizedPhone, otp);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  async verifyGenericOtp(verifyContactOtpDto: VerifyContactOtpDto) {
    const normalizedEmail = this.normalizeEmail(verifyContactOtpDto.email);
    const normalizedPhone = this.normalizePhone(verifyContactOtpDto.phone);

    if (!verifyContactOtpDto.otp || (!normalizedEmail && !normalizedPhone)) {
      throw new BadRequestException('Email or phone and OTP are required');
    }

    const otpType = verifyContactOtpDto.type || 'login';
    const otpKey = `otp:${normalizedEmail || normalizedPhone}:${otpType}`;
    const isValid = await this.otpUtil.verifyOTP(
      this.redisClient,
      otpKey,
      verifyContactOtpDto.otp,
      false
    );

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  }

  async verifyPassword(verifyPasswordDto: VerifyPasswordDto) {
    if (!verifyPasswordDto.password) {
      throw new BadRequestException('Password is required');
    }

    const normalizedEmail = this.normalizeEmail(verifyPasswordDto.email);
    const normalizedPhone = this.normalizePhone(verifyPasswordDto.phone);

    const whereConditions: FindOptionsWhere<User>[] = [];
    if (verifyPasswordDto.userId) {
      whereConditions.push({ userId: verifyPasswordDto.userId });
    }
    if (normalizedEmail) {
      whereConditions.push({ email: normalizedEmail });
    }
    if (normalizedPhone) {
      whereConditions.push({ phone: normalizedPhone });
    }

    if (!whereConditions.length) {
      throw new BadRequestException('User identifier is required');
    }

    const user = await this.userRepository.findOne({
      where: whereConditions.length === 1 ? whereConditions[0] : whereConditions,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await bcrypt.compare(
      verifyPasswordDto.password,
      user.password,
    );

    if (!isValidPassword) {
      throw new BadRequestException('Invalid password');
    }

    return {
      success: true,
      message: 'Password verified successfully',
      data: {
        userId: user.userId,
      },
    };
  }

  async verifyRecoveryKey(recoveryKey: string) {
    if (!recoveryKey || !recoveryKey.trim()) {
      throw new BadRequestException('Recovery key is required');
    }
    const cleanKey = recoveryKey.trim();
    const user = await this.userRepository.findOne({ where: { recoveryKey: cleanKey } });
    if (!user) {
      throw new BadRequestException('Invalid recovery key');
    }
    return {
      success: true,
      data: {
        fullName: user.fullName,
        email: user.email || user.phone,
      }
    };
  }

  

  async deleteUser(userId: string) {
    const user = await this.findUserByAnyId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.findUserByAnyId(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: {
        internalId: user.id,      // UUIDv7 internal identifier
        publicId: user.userId,    // ULID public identifier
        accountType: user.accountType,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        status: user.status,
        currency: user.currency,
      },
    };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.findUserByAnyId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.accountType !== user.accountType) {
      throw new BadRequestException(
        'accountType does not match existing account',
      );
    }

    const missingCommon: string[] = [];
    if (!dto.fullName && !user.fullName) missingCommon.push('fullName');
    if (!dto.dateOfBirth && !user.dateOfBirth) missingCommon.push('dateOfBirth');
    if (!dto.gender && !user.gender) missingCommon.push('gender');
    if (!dto.nationality && !user.nationality) missingCommon.push('nationality');
    if (!dto.permanentAddress && !user.permanentAddress)
      missingCommon.push('permanentAddress');
    if (!dto.governmentId && !user.governmentId)
      missingCommon.push('governmentId');
    if (!dto.idDocument && !user.idDocument) missingCommon.push('idDocument');
    if (!dto.currency && !user.currency) missingCommon.push('currency');
    if (!dto.phone && !user.phone && !user.email && !dto.email)
      missingCommon.push('phoneOrEmail');

    if (user.accountType === AccountType.AGENCY) {
      const dobStr =
        dto.dateOfBirth || (user.dateOfBirth && user.dateOfBirth.toISOString());
      if (!dobStr) {
        missingCommon.push('dateOfBirth');
      } else {
        const birthDate = new Date(dobStr);
        const age = Math.floor(
          (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000),
        );
        if (age < 16) {
          throw new BadRequestException(
            'Agency account requires minimum age of 16 years',
          );
        }
      }
    }

    if (user.accountType === AccountType.BUSINESS) {
      const dobStr =
        dto.dateOfBirth || (user.dateOfBirth && user.dateOfBirth.toISOString());
      if (!dobStr) {
        missingCommon.push('dateOfBirth');
      } else {
        const birthDate = new Date(dobStr);
        const age = Math.floor(
          (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000),
        );
        if (age < 20) {
          throw new BadRequestException(
            'Business account requires minimum age of 20 years',
          );
        }
      }
      if (!dto.passportNumber && !user.passportNumber) {
        missingCommon.push('passportNumber');
      }
    }

    if (missingCommon.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missingCommon.join(', ')}`,
      );
    }

    const assignIf = (field: keyof User, value: any) => {
      if (value !== undefined && value !== null) {
        (user as any)[field] = value as any;
      }
    };

    assignIf('profilePhoto', dto.profilePhoto);
    assignIf('fullName', dto.fullName);
    assignIf('gender', dto.gender);
    assignIf('nationality', dto.nationality);
    assignIf('permanentAddress', dto.permanentAddress);
    assignIf('governmentId', dto.governmentId);
    assignIf('idDocument', dto.idDocument);
    assignIf('phone', dto.phone);
    assignIf('email', dto.email);
    assignIf('currency', dto.currency);
    assignIf('passportNumber', dto.passportNumber);
    if (dto.dateOfBirth) {
      user.dateOfBirth = new Date(dto.dateOfBirth);
    }

    if (user.accountType === AccountType.AGENCY && dto.agencyName) {
      user.agencyInfo = {
        ...(user.agencyInfo || {}),
        agencyName: dto.agencyName,
        serviceArea: dto.serviceArea || user.agencyInfo?.serviceArea,
      } as any;
    }

    user.status = UserStatus.PENDING;
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Profile submitted for verification',
      data: {
        userId: user.userId,
        status: user.status,
      },
    };
  }

  async getAdminStats() {
    try {
      const stats: Record<string, any> = {};

      const accountTypes = [
        { type: AccountType.USER, key: 'user' },
        { type: AccountType.AGENCY, key: 'affiliate' },
        { type: AccountType.BUSINESS, key: 'business' },
      ];

      const statusMap = {
        ACTIVE: UserStatus.ACTIVE,
        SUSPEND: UserStatus.SUSPENDED,
        BLOCK: UserStatus.BLOCKED,
        DORMANT: UserStatus.DORMANT,
        CLOSED: UserStatus.CLOSED,
        PENDING: UserStatus.PENDING,
        INACTIVE: UserStatus.INACTIVE,
      };

      for (const { type, key } of accountTypes) {
        stats[key] = { total: 0 };
        
        const qb = this.userRepository.createQueryBuilder('user')
          .where('user.accountType = :type', { type: type.toLowerCase() });
        
        stats[key]['total'] = await qb.getCount();

        for (const [statusKey, statusVal] of Object.entries(statusMap)) {
          const sqb = this.userRepository.createQueryBuilder('user')
            .where('user.accountType = :type', { type: type.toLowerCase() })
            .andWhere('user.status = :status', { status: statusVal });
          
          stats[key][statusKey] = await sqb.getCount();
        }
      }

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('Error in getAdminStats:', error);
      throw new BadRequestException('Failed to fetch admin stats');
    }
  }

  async getUsers(query: any) {
    try {
      const page = query.page && query.page > 0 ? query.page : 1;
      const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
      const skip = (page - 1) * limit;

      const qb = this.userRepository.createQueryBuilder('user');

      if (query.search) {
        const like = `%${query.search.toLowerCase()}%`;
        qb.andWhere(
          '(LOWER(CAST(user.userId AS text)) LIKE :like OR LOWER(CAST(user.fullName AS text)) LIKE :like OR LOWER(CAST(user.email AS text)) LIKE :like OR LOWER(CAST(user.phone AS text)) LIKE :like)',
          { like },
        );
      }

      if (query.accountType) {
        qb.andWhere('user.accountType = :accountType', { accountType: query.accountType.toLowerCase() });
      }

      if (query.status) {
        qb.andWhere('user.status = :status', { status: query.status });
      }

      if (query.currency) {
        qb.andWhere('user.currency = :currency', { currency: query.currency });
      }

      if (query.startDate) {
        qb.andWhere('user.createdAt >= :startDate', { startDate: new Date(query.startDate) });
      }

      if (query.endDate) {
        qb.andWhere('user.createdAt <= :endDate', { endDate: new Date(query.endDate) });
      }

      const total = await qb.getCount();
      const users = await qb
        .orderBy('user.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getMany();

      const sanitizedUsers = users.map((user) => {
        const { password, ...rest } = user as any;
        return rest;
      });

      const analytics: Record<string, number> = {
        all: total,
        active: 0,
        suspended: 0,
        blocked: 0,
        dormant: 0,
        closed: 0,
        pending: 0,
        inactive: 0,
      };

      const statusMap: [keyof typeof analytics, UserStatus][] = [
        ['active', UserStatus.ACTIVE],
        ['suspended', UserStatus.SUSPENDED],
        ['blocked', UserStatus.BLOCKED],
        ['dormant', UserStatus.DORMANT],
        ['closed', UserStatus.CLOSED],
        ['pending', UserStatus.PENDING],
        ['inactive', UserStatus.INACTIVE],
      ];

      for (const [key, statusValue] of statusMap) {
        const statusQb = this.userRepository.createQueryBuilder('user');
        if (query.search) {
          const like = `%${query.search.toLowerCase()}%`;
          statusQb.andWhere(
            '(LOWER(CAST(user.userId AS text)) LIKE :like OR LOWER(CAST(user.fullName AS text)) LIKE :like OR LOWER(CAST(user.email AS text)) LIKE :like OR LOWER(CAST(user.phone AS text)) LIKE :like)',
            { like },
          );
        }
        statusQb.andWhere('user.status = :status', { status: statusValue });
        analytics[key] = await statusQb.getCount();
      }

      const accountTypeCounts: Record<AccountType, number> = {
        [AccountType.USER]: 0,
        [AccountType.AGENCY]: 0,
        [AccountType.BUSINESS]: 0,
      };

      for (const accountType of Object.values(AccountType)) {
        const typeQb = this.userRepository.createQueryBuilder('user');
        if (query.search) {
          const like = `%${query.search.toLowerCase()}%`;
          typeQb.andWhere(
            '(LOWER(CAST(user.userId AS text)) LIKE :like OR LOWER(CAST(user.fullName AS text)) LIKE :like OR LOWER(CAST(user.email AS text)) LIKE :like OR LOWER(CAST(user.phone AS text)) LIKE :like)',
            { like },
          );
        }
        typeQb.andWhere('user.accountType = :accountType', { accountType });
        accountTypeCounts[accountType] = await typeQb.getCount();
      }

      return {
        success: true,
        data: {
          users: sanitizedUsers,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
          analytics: {
            ...analytics,
            accountTypes: accountTypeCounts,
          },
        },
      };
    } catch (error) {
      console.error('Error in getUsers:', error);
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async getUserDetails(userId: string) {
    const user = await this.findUserByAnyId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...sanitizedUser } = user as any;
    return {
      success: true,
      data: sanitizedUser,
    };
  }

  async updateUserStatus(userId: string, status: string, reason: string, adminEmail: string | undefined) {
    status = status.toLowerCase();
    if (status === 'suspend') status = 'suspended';
    if (status === 'block') status = 'blocked';
    const user = await this.findUserByAnyId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === status) {
      throw new BadRequestException(`User is already in ${status} status`);
    }

    const historyEntry = {
      status: status as UserStatus,
      reason: reason || 'Status changed',
      changedBy: adminEmail,
      changedAt: new Date().toISOString(),
    };

    const history = Array.isArray(user.statusHistory)
      ? [...user.statusHistory, historyEntry]
      : [historyEntry];

    user.statusHistory = history;
    user.status = status as UserStatus;

    await this.userRepository.save(user);

    return {
      success: true,
      message: `User status updated to ${status} successfully`,
      data: {
        userId: user.userId,
        previousStatus: user.status,
        newStatus: status,
        reason,
        changedBy: adminEmail,
        changedAt: historyEntry.changedAt,
        statusHistory: history,
      },
    };
  }

  async updatePreferences(userId: string, preferences: Partial<User['preferences']>) {
    const user = await this.findUserByAnyId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.preferences = { ...user.preferences, ...preferences };
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Preferences updated successfully',
      data: user.preferences,
    };
  }
}

