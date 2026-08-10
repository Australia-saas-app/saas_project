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
import { Repository, FindOptionsWhere, DeepPartial, DataSource } from 'typeorm';
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
  KycStatus,
  TwoFactorMethod,
  Gender,
} from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { KycApplication } from '../../entities/kyc-application.entity';
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
    @InjectRepository(KycApplication)
    private readonly kycApplicationRepository: Repository<KycApplication>,
    private readonly otpUtil: OtpUtil,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
    private readonly dataSource: DataSource,
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
      if (accountType === AccountType.AFFILIATE && age < 16) {
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
        where: { email: normalizedEmail },
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

    if (accountType === AccountType.AFFILIATE && registerDto.agencyInfo?.agencyName) {
      try {
        const existingAgency = await this.userRepository
          .createQueryBuilder('user')
          .where('user.accountType = :accountType', {
            accountType: AccountType.AFFILIATE,
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

    let initialStatus = UserStatus.ACTIVE;
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

    let prefix = 'USR-';
    if (accountType === AccountType.AFFILIATE) prefix = 'AFF-';
    if (accountType === AccountType.BUSINESS) prefix = 'BSN-';
    const lastUser = await this.userRepository.findOne({
      where: { accountType },
      order: { createdAt: 'DESC' },
    });
    let nextNum = 1;
    if (lastUser && lastUser.userId) {
      const match = lastUser.userId.match(/\d+$/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }
    const customUserId = `${prefix}${nextNum < 10 ? `0${nextNum}` : nextNum}`;

    const user = this.userRepository.create({
      userId: customUserId,
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

    if (accountType === AccountType.AFFILIATE && registerDto.agencyInfo) {
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

    let user = await this.userRepository.findOne({
      where: [
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
      ],
    });

    if (user) {
      if (loginDto.accountType && user.accountType && user.accountType.toLowerCase() !== loginDto.accountType.toLowerCase()) {
        throw new ForbiddenException({
          success: false,
          error: 'ACCOUNT_TYPE_MISMATCH',
          message: `Account not found for the selected role. Please check the active tab.`,
        });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'Unknown IP';
      const actualIp = clientIp.split(',')[0].trim();
      const deviceIdentifier = loginDto.deviceId || 'unknown-device';

      if (deviceIdentifier === 'unknown-device') {
        throw new BadRequestException('Device ID is required for secure login');
      }

      if (!user.trustedIps || user.trustedIps.length === 0) {
        user.trustedIps = Array.from(new Set([deviceIdentifier, actualIp]));
        await this.userRepository.save(user);
      } else if (!user.trustedIps.includes(deviceIdentifier) && !user.trustedIps.includes(actualIp)) {
        const otpKey = `otp:${user.email || user.phone}:new_device`;

        if (loginDto.otp) {
          const isValid = await this.otpUtil.verifyOTP(this.redisClient, otpKey, loginDto.otp);
          if (!isValid) {
            throw new BadRequestException('Invalid or expired OTP for new device authentication');
          }
          user.trustedIps = Array.from(new Set([...user.trustedIps, deviceIdentifier, actualIp]));
          await this.userRepository.save(user);
        } else {
          const otp = this.otpUtil.generateOTP(6, user.email || user.phone);
          await this.otpUtil.storeOTP(this.redisClient, otpKey, otp);

          if (user.email) {
            await this.otpUtil.sendOTPEmail(user.email, otp, 'new_device', { ipAddress: actualIp });
          } else if (user.phone) {
            await this.otpUtil.sendOTPSMS(user.phone, otp);
          }

          throw new ForbiddenException({
            success: false,
            error: 'NEW_DEVICE_OTP_REQUIRED',
            message: 'New device or IP detected. Please enter the OTP sent to your email to authorize this login.',
            data: { capturedIp: actualIp }
          });
        }
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
      login_role: loginDto.accountType,
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
    if (normalizedEmail) whereConditions.push({ email: normalizedEmail, ...(resetPasswordDto.accountType && { accountType: resetPasswordDto.accountType }) } as any);
    if (normalizedPhone) whereConditions.push({ phone: normalizedPhone, ...(resetPasswordDto.accountType && { accountType: resetPasswordDto.accountType }) } as any);

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

    if (type === 'admin_reset' || type === 'password_reset' || type === 'forgot-password') {
      if (normalizedEmail) {
        const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
        if (!user) throw new BadRequestException('Email not Exists');
      } else if (normalizedPhone) {
        const user = await this.userRepository.findOne({ where: { phone: normalizedPhone } });
        if (!user) throw new BadRequestException('Phone No not exists');
      }
    }

    if (type === 'registration') {
      const whereConditions: any[] = [];
      if (normalizedEmail) whereConditions.push({ email: normalizedEmail });
      if (normalizedPhone) whereConditions.push({ phone: normalizedPhone });

      if (whereConditions.length > 0) {
        const existing = await this.userRepository.findOne({ where: whereConditions });
        if (existing) {
          const field = normalizedEmail ? 'Email' : 'Phone number';
          throw new BadRequestException(`${field} already exists`);
        }
      }
    }

    const otp = this.otpUtil.generateOTP(6, normalizedEmail || normalizedPhone);
    const otpKey = `otp:${normalizedEmail || normalizedPhone}:${type}`;
    await this.otpUtil.storeOTP(this.redisClient, otpKey, otp);

    if (normalizedEmail) {
      await this.otpUtil.sendOTPEmail(normalizedEmail, otp, type);
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
      whereConditions.push({ email: normalizedEmail, ...(verifyPasswordDto.accountType && { accountType: verifyPasswordDto.accountType }) } as any);
    }
    if (normalizedPhone) {
      whereConditions.push({ phone: normalizedPhone, ...(verifyPasswordDto.accountType && { accountType: verifyPasswordDto.accountType }) } as any);
    }

    if (!whereConditions.length) {
      throw new BadRequestException('User identifier is required');
    }

    let user: any = await this.userRepository.findOne({
      where: whereConditions.length === 1 ? whereConditions[0] : whereConditions,
    });

    if (!user && normalizedEmail) {
      user = await this.adminRepository.findOne({
        where: { email: normalizedEmail },
      });
    }

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
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
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
        email: user.email,
        phone: user.phone,
        accountType: user.accountType,
      }
    };
  }



  async deleteUser(userId: string) {
    const user = await this.findUserByAnyId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Purge associated OTPs / Redis keys
    if (user.email) {
      await this.redisClient.del(`otp:${user.email}:registration`).catch(() => undefined);
      await this.redisClient.del(`otp:${user.email}:forgot-password`).catch(() => undefined);
    }
    if (user.phone) {
      await this.redisClient.del(`otp:${user.phone}:registration`).catch(() => undefined);
      await this.redisClient.del(`otp:${user.phone}:forgot-password`).catch(() => undefined);
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const tablesWithUserId = [
        'user_profiles', 'user_contacts', 'user_activities', 'user_preferences',
        'project_proposals', 'project_participants', 'activities', 'notifications',
        'payment_cards', 'conversations', 'user_notifications', 'user_notification_preferences',
        'notification_logs', 'currency_conversion_logs', 'messages', 'affiliates',
        'affiliate_profiles', 'orders', 'audits', 'wallets', 'transactions', 'user_sessions',
        'user_consents', 'mfa_secrets', 'oauth_tokens', 'oauth_authorization_codes', 'system_events',
        'activity_logs', 'audit_trails', 'chat_topics', 'security_deposits', 'affiliate_incomes',
        'employees', 'blogs', 'files', 'folders', 'file_shares', 'file_versions', 'real_estate_properties',
        'contacts', 'branches', 'notification_schedules', 'notification_channels', 'technical_services',
        'technical_categories', 'projects', 'project_messages', 'project_tasks', 'blog_tags', 'blog_categories',
        'order_status_history', 'construction_categories', 'construction_services', 'kyc_application'
      ];

      // Helper to safely execute a query without aborting the main transaction on error
      const safeDelete = async (query: string, params: any[]) => {
        const sp = `sp_${Math.random().toString(36).substring(2, 10)}`;
        await runner.query(`SAVEPOINT ${sp}`);
        try {
          await runner.query(query, params);
          await runner.query(`RELEASE SAVEPOINT ${sp}`);
          return true;
        } catch (e: any) {
          console.error(`safeDelete failed for query: ${query} params: ${params}`, e?.message || e);
          await runner.query(`ROLLBACK TO SAVEPOINT ${sp}`);
          return false;
        }
      };

      // Loop multiple times to resolve foreign key dependencies (child deleted before parent)
      for (let attempt = 0; attempt < 3; attempt++) {
        for (const table of tablesWithUserId) {
          await safeDelete(`DELETE FROM "${table}" WHERE "userId" = $1`, [user.userId]);
          await safeDelete(`DELETE FROM "${table}" WHERE "userId" = $1`, [user.id]);
        }
        await safeDelete(`DELETE FROM "withdrawal_requests" WHERE "businessUserId" = $1`, [user.userId]);
        await safeDelete(`DELETE FROM "withdrawal_requests" WHERE "businessUserId" = $1`, [user.id]);
        await safeDelete(`DELETE FROM "referrals" WHERE "referredUserId" = $1 OR "referrerId" = $1`, [user.userId]);
        await safeDelete(`DELETE FROM "referrals" WHERE "referredUserId" = $1 OR "referrerId" = $1`, [user.id]);

        // Handle microservice-specific owner ID formats
        await safeDelete(`DELETE FROM "files" WHERE "ownerId" = $1`, [user.userId]);
        await safeDelete(`DELETE FROM "files" WHERE "ownerId" = $1`, [user.id]);
        await safeDelete(`DELETE FROM "folders" WHERE "ownerId" = $1`, [user.userId]);
        await safeDelete(`DELETE FROM "folders" WHERE "ownerId" = $1`, [user.id]);
        await safeDelete(`DELETE FROM "blogs" WHERE "authorId" = $1`, [user.userId]);
        await safeDelete(`DELETE FROM "blogs" WHERE "authorId" = $1`, [user.id]);
        await safeDelete(`DELETE FROM "employees" WHERE "managerId" = $1`, [user.userId]);
        await safeDelete(`DELETE FROM "employees" WHERE "managerId" = $1`, [user.id]);
      }

      // Hard delete all MongoDB Activity Logs internally
      try {
        const userProfileUrl = process.env.USER_PROFILE_SERVICE_URL || 'http://saas-backend-user-profile:3005/user-profile-service';
        await fetch(`${userProfileUrl}/activity/internal/${user.userId}`, {
          method: 'DELETE',
        }).catch(e => console.error("Internal log delete warning", e));
      } catch (err) {
        console.error("Failed to delete MongoDB logs", err);
      }

      // Permanent hard delete of user entity from database
      const userDeleted = await safeDelete(`DELETE FROM "users" WHERE "id" = $1`, [user.id]);
      if (!userDeleted) {
        throw new Error('Failed to delete user row due to foreign key constraints');
      }

      await runner.commitTransaction();
    } catch (err: any) {
      await runner.rollbackTransaction();
      console.error('DELETE USER ERROR:', err);
      throw new BadRequestException('Delete user failed: ' + err.message);
    } finally {
      await runner.release();
    }

    return { message: 'User account and all associated data permanently deleted successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.findUserByAnyId(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Load KYC application data from separate table
    const kycRecord = await this.kycApplicationRepository.findOne({ where: { userId: user.userId } });
    const kycApplicationData = kycRecord?.applicationData ?? null;

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
        kycStatus: user.kycStatus,
        currency: user.currency,
        profilePhoto: user.profilePhoto,
        idDocument: user.idDocument,
        nationality: user.nationality,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        governmentId: user.governmentId,
        governmentIdType: user.governmentIdType,
        permanentAddress: user.permanentAddress,
        kycApplicationData: kycApplicationData,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
        createdAt: user.createdAt,
      },
    };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.findUserByAnyId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.accountType && dto.accountType.toLowerCase() !== user.accountType.toLowerCase()) {
      // Account type case mismatch ignore or validate softly
    }

    const missingCommon: string[] = [];
    if (!dto.fullName && !user.fullName) missingCommon.push('fullName');

    if (user.accountType === AccountType.AFFILIATE) {
      const dobStr =
        dto.dateOfBirth || (user.dateOfBirth ? new Date(user.dateOfBirth).toISOString() : null);
      if (dobStr) {
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
        dto.dateOfBirth || (user.dateOfBirth ? new Date(user.dateOfBirth).toISOString() : null);
      if (dobStr) {
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
    }

    const assignIf = (field: keyof User, value: any) => {
      if (value !== undefined) {
        (user as any)[field] = (value === null || value === '') ? null : value;
      }
    };

    assignIf('profilePhoto', dto.profilePhoto);
    assignIf('fullName', dto.fullName);
    if (dto.username !== undefined && dto.username !== user.username) {
      if (dto.username) {
        const existing = await this.userRepository.findOne({ where: { username: dto.username } });
        if (existing && existing.userId !== user.userId) {
          throw new BadRequestException('Username is already taken');
        }
      }
      user.username = dto.username || (null as unknown as string);
    }
    assignIf('bio', dto.bio);
    if (dto.gender !== undefined) {
      if (dto.gender === '' || dto.gender === null) {
        user.gender = null as unknown as Gender;
      } else {
        const normalizedGender = String(dto.gender).toLowerCase().trim() as Gender;
        if (Object.values(Gender).includes(normalizedGender)) {
          user.gender = normalizedGender;
        }
      }
    }
    assignIf('nationality', dto.nationality);
    assignIf('permanentAddress', dto.permanentAddress);
    assignIf('governmentId', dto.governmentId);
    assignIf('governmentIdType', dto.governmentIdType);
    assignIf('idDocument', dto.idDocument);
    assignIf('phone', dto.phone);
    assignIf('email', dto.email);
    if (dto.currency !== undefined) {
      if (dto.currency) {
        user.currency = String(dto.currency).split(' ')[0].substring(0, 10).trim(); // Prevent varchar(10) overflow and extract ISO code
      } else {
        user.currency = 'USD';
      }
    }
    assignIf('passportNumber', dto.passportNumber);
    assignIf('twoFactorEnabled', dto.twoFactorEnabled);

    if (dto.twoFactorMethod !== undefined) {
      if (!dto.twoFactorMethod) {
        user.twoFactorMethod = null as unknown as TwoFactorMethod;
      } else {
        const val = String(dto.twoFactorMethod).toLowerCase();
        if (val.includes('@') || val === 'email') {
          user.twoFactorMethod = TwoFactorMethod.EMAIL;
        } else {
          user.twoFactorMethod = TwoFactorMethod.PHONE;
        }
      }
    }

    if (dto.dateOfBirth) {
      user.dateOfBirth = new Date(dto.dateOfBirth);
    }

    if (user.accountType === AccountType.AFFILIATE && dto.agencyName) {
      user.agencyInfo = {
        ...(user.agencyInfo || {}),
        agencyName: dto.agencyName,
        serviceArea: dto.serviceArea || user.agencyInfo?.serviceArea,
      } as any;
    }

    if (!user.status) {
      user.status = UserStatus.ACTIVE;
    }
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Profile submitted for verification',
      data: {
        userId: user.userId,
        status: user.status,
        kycStatus: user.kycStatus,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
      },
    };
  }

  async getAdminStats() {
    try {
      const stats: Record<string, any> = {};

      const accountTypes = [
        { type: AccountType.USER, key: 'user' },
        { type: AccountType.AFFILIATE, key: 'affiliate' },
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
      const isUnlimited = query.limit === 'unlimited' || query.limit === 'all' || query.limit === '0' || Number(query.limit) === 0;
      const page = query.page && query.page > 0 ? Number(query.page) : 1;
      const limit = isUnlimited ? 0 : (query.limit && Number(query.limit) > 0 ? Number(query.limit) : 10);
      const skip = isUnlimited ? 0 : (page - 1) * limit;

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
        qb.andWhere('user.status = :status', { status: query.status.toLowerCase() });
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
      qb.orderBy('user.createdAt', 'DESC');
      if (!isUnlimited) {
        qb.skip(skip).take(limit);
      }
      const users = await qb.getMany();

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
        [AccountType.AFFILIATE]: 0,
        [AccountType.BUSINESS]: 0,
        [AccountType.AGENCY]: 0,
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

  async updateUserStatus(userId: string, status: string, reason: string, adminEmail: string | undefined, ipAddress: string = '127.0.0.1') {
    status = status.toLowerCase();
    if (status === 'suspend') status = 'suspended';
    if (status === 'block') status = 'blocked';
    if (status === 'verify' || status === 'activate' || status === 'approved') status = 'active';
    if (status === 'unverify' || status === 'deactivate' || status === 'rejected') status = 'pending';
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

    try {
      const userProfileUrl = process.env.USER_PROFILE_SERVICE_URL || 'http://saas-backend-user-profile:3005/user-profile-service';
      fetch(`${userProfileUrl}/activity/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ACCOUNT_STATUS_CHANGED',
          resource: `Account status updated to ${status} by administrator`,
          details: { userId: user.userId, email: user.email, name: user.fullName, newStatus: status, changedBy: adminEmail },
          userAgent: 'Admin Backend',
          ipAddress
        })
      }).catch(() => undefined);
    } catch { }

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

  async updateKycStatus(userId: string, kycStatus: string, reason: string, adminEmail: string | undefined, ipAddress: string = '127.0.0.1') {
    const user = await this.findUserByAnyId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kycStatus === kycStatus) {
      throw new BadRequestException(`User KYC is already in ${kycStatus} status`);
    }

    user.kycStatus = kycStatus as KycStatus;
    if (kycStatus === 'approved') {
      user.status = UserStatus.ACTIVE;
    }
    await this.userRepository.save(user);

    try {
      const userProfileUrl = process.env.USER_PROFILE_SERVICE_URL || 'http://saas-backend-user-profile:3005/user-profile-service';
      fetch(`${userProfileUrl}/activity/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: kycStatus === 'approved' ? 'KYC_APPROVED' : 'KYC_REJECTED',
          resource: `KYC application ${kycStatus} by administrator`,
          details: { userId: user.userId, email: user.email, name: user.fullName, kycStatus, reason, changedBy: adminEmail },
          userAgent: 'Admin Backend',
          ipAddress
        })
      }).catch(() => undefined);
    } catch { }

    return {
      success: true,
      message: `User KYC status updated to ${kycStatus} successfully`,
      data: {
        userId: user.userId,
        kycStatus: user.kycStatus,
        reason,
        changedBy: adminEmail,
      },
    };
  }

  async applyForKyc(userId: string, clientApplicationData?: any) {
    const user = await this.findUserByAnyId(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Load existing KYC record from separate table
    let kycRecord = await this.kycApplicationRepository.findOne({ where: { userId: user.userId } });

    // ── Already under review — block re-submission, return saved snapshot ───
    if (user.kycStatus === KycStatus.PENDING || user.kycStatus === KycStatus.SUBMITTED) {
      return {
        success: true,
        message: 'KYC Application already submitted and is pending review.',
        data: {
          userId: user.userId,
          kycStatus: user.kycStatus,
          kycApplicationData: kycRecord?.applicationData ?? null,
          alreadySubmitted: true,
        },
      };
    }

    // ── Already approved — block re-submission ───────────────────────────────
    if (user.kycStatus === KycStatus.APPROVED) {
      return {
        success: true,
        message: 'KYC Application is already approved.',
        data: {
          userId: user.userId,
          kycStatus: user.kycStatus,
          kycApplicationData: kycRecord?.applicationData ?? null,
          alreadySubmitted: true,
        },
      };
    }

    // ── NONE or REJECTED — snapshot current profile into kyc_application table ─
    const isResubmission = user.kycStatus === KycStatus.REJECTED;
    const applicationData = {
      fullName: clientApplicationData?.fullName || user.fullName,
      email: clientApplicationData?.email || user.email,
      gender: clientApplicationData?.gender || (user as any).gender,
      nationality: clientApplicationData?.nationality || user.nationality,
      governmentId: clientApplicationData?.governmentId || user.governmentId || (user as any).nationalIdentity,
      governmentIdType: clientApplicationData?.governmentIdType || user.governmentIdType || 'NID',
      dateOfBirth: clientApplicationData?.dateOfBirth || (user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''),
      permanentAddress: clientApplicationData?.permanentAddress || user.permanentAddress || { country: '', city: '', state: '', zipCode: '', address: '' },
      idDocument: clientApplicationData?.idDocument || clientApplicationData?.documentUrl || user.idDocument,
      documentFrontUrl: clientApplicationData?.documentFrontUrl || (user as any).documentFrontUrl,
      documentBackUrl: clientApplicationData?.documentBackUrl || (user as any).documentBackUrl,
      avatarUrl: clientApplicationData?.avatarUrl || user.profilePhoto || (user as any).avatarUrl,
      appliedAt: new Date().toISOString(),
      ...(isResubmission ? { resubmittedAt: new Date().toISOString() } : {}),
    };

    // Upsert into kyc_application table (create or update)
    if (kycRecord) {
      kycRecord.applicationData = applicationData;
    } else {
      kycRecord = this.kycApplicationRepository.create({ userId: user.userId, applicationData });
    }
    await this.kycApplicationRepository.save(kycRecord);

    user.kycStatus = KycStatus.PENDING;
    await this.userRepository.save(user);

    return {
      success: true,
      message: isResubmission
        ? 'KYC Application resubmitted successfully'
        : 'KYC Application submitted successfully',
      data: {
        userId: user.userId,
        kycStatus: user.kycStatus,
        kycApplicationData: applicationData,
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


  async changePassword(email: string, oldPassword?: string, newPassword?: string) {
    if (!newPassword || !oldPassword) {
      throw new BadRequestException('Both old and new passwords are required');
    }

    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) throw new BadRequestException('Email is required');

    let user: any = await this.adminRepository.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect old password');
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException('New password must be different from old password');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    if (user.role) {
      await this.adminRepository.save(user);
    } else {
      await this.userRepository.save(user);
    }

    return { success: true, message: 'Password updated successfully' };
  }
}

