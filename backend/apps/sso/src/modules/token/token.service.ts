import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { randomUUID, createHash } from 'crypto';
import { TokenRequestDto } from './dto/token-request.dto';
import { OAuthClient } from '../../entities/oauth-client.entity';
import { OAuthToken, TokenType } from '../../entities/oauth-token.entity';
import { User, AccountType, UserStatus } from '../../entities/user.entity';
import { UserSession } from '../../entities/user-session.entity';
import { JwtService } from '../../common/services/jwt.service';
import { OtpUtil } from '../../common/utils/otp.util';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { Inject } from '@nestjs/common';

interface IssueTokenOptions {
  user: User;
  client: OAuthClient;
  scope: string;
  session: UserSession;
  ipAddress?: string;
  userAgent?: string;
  fingerprint?: string;
}

@Injectable()
export class TokenService {
  private readonly defaultScope = 'openid profile email offline_access';

  constructor(
    @InjectRepository(OAuthClient)
    private readonly clientRepository: Repository<OAuthClient>,
    @InjectRepository(OAuthToken)
    private readonly tokenRepository: Repository<OAuthToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    private readonly jwtService: JwtService,
    private readonly otpUtil: OtpUtil,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
  ) { }

  async handleTokenRequest(dto: TokenRequestDto, req: Request) {
    switch (dto.grant_type) {
      case 'password':
        return this.handlePasswordGrant(dto, req);
      case 'refresh_token':
        return this.handleRefreshGrant(dto, req);
      default:
        throw new BadRequestException({
          error: 'unsupported_grant_type',
          error_description: `grant_type ${dto.grant_type} is not supported`,
        });
    }
  }

  async issueTokensForUser(
    user: User,
    context: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
      deviceName?: string;
      loginRole?: string;
    },
  ) {
    const client = await this.ensureClient();
    const session = await this.createSessionForUser(user, client, context);
    return this.issueTokens({
      user,
      client,
      scope: this.defaultScope,
      session,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  private async handlePasswordGrant(dto: TokenRequestDto, req: Request) {
    const scope = dto.scope ?? this.defaultScope;
    const client = await this.ensureClient(dto.client_id, dto.client_secret);
    const identifier = dto.username?.trim();

    if (client.grants?.length && !client.grants.includes('password')) {
      throw new UnauthorizedException({
        error: 'unauthorized_client',
        error_description: 'Client is not permitted to use the password grant',
      });
    }

    if (!identifier) {
      throw new BadRequestException('username is required');
    }

    if (!dto.password) {
      throw new BadRequestException('password is required');
    }

    const user = await this.locateUser(identifier);

    if (!user) {
      throw new UnauthorizedException({
        error: 'invalid_grant',
        error_description: 'Invalid credentials',
      });
    }

    const isValidPassword = await user.comparePassword(dto.password!);
    if (!isValidPassword) {
      throw new UnauthorizedException({
        error: 'invalid_grant',
        error_description: 'Invalid credentials',
      });
    }

    this.ensureUserIsAllowed(user);

    if (user.twoFactorEnabled) {
      await this.ensureValidOtp(user, dto.otp);
    }

    const forwardedIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || (req.headers['x-real-ip'] as string)?.trim() || req.ip || '127.0.0.1';

    const session = await this.createSessionForUser(user, client, {
      deviceId: dto.device_id,
      deviceName: dto.device_name,
      ipAddress: forwardedIp,
      userAgent: req.headers['user-agent'] as string | undefined,
      loginRole: dto.login_role,
    });

    const now = new Date();
    user.lastLoginAt = now;
    user.lastActiveAt = now;
    if (forwardedIp && forwardedIp !== 'Unknown IP' && forwardedIp !== '127.0.0.1') {
      user.trustedIps = Array.from(new Set([...(user.trustedIps || []), forwardedIp, dto.device_id].filter(Boolean) as string[]));
    }
    if ((!user.kycStatus || user.kycStatus === ('none' as any)) && (user as any).kycstatus && (user as any).kycstatus !== 'none') {
      user.kycStatus = (user as any).kycstatus;
    }
    await this.userRepository.save(user);

    return this.issueTokens({
      user,
      client,
      scope,
      session,
      ipAddress: forwardedIp,
      userAgent: req.headers['user-agent'] as string | undefined,
      fingerprint: dto.device_id,
    });
  }

  private async handleRefreshGrant(dto: TokenRequestDto, req: Request) {
    if (!dto.refresh_token) {
      throw new BadRequestException('refresh_token is required');
    }

    const client = await this.ensureClient(dto.client_id, dto.client_secret);
    if (client.grants?.length && !client.grants.includes('refresh_token')) {
      throw new UnauthorizedException({
        error: 'unauthorized_client',
        error_description: 'Client is not permitted to use the refresh_token grant',
      });
    }

    const refreshTokenHash = this.hashToken(dto.refresh_token!);
    const existingRefreshToken = await this.tokenRepository.findOne({
      where: {
        token: refreshTokenHash,
        tokenType: TokenType.REFRESH,
        revoked: false,
      },
      relations: {
        user: true,
        client: true,
      },
    });

    if (!existingRefreshToken) {
      throw new UnauthorizedException({
        error: 'invalid_grant',
        error_description: 'Refresh token is invalid or revoked',
      });
    }

    if (existingRefreshToken.client.clientId !== client.clientId) {
      throw new UnauthorizedException({
        error: 'invalid_grant',
        error_description: 'Refresh token does not belong to the supplied client',
      });
    }

    if (existingRefreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException({
        error: 'invalid_grant',
        error_description: 'Refresh token expired',
      });
    }

    const session = await this.sessionRepository.findOne({
      where: { id: existingRefreshToken.sessionId },
      relations: { user: true, client: true },
    });

    if (!session || !session.active) {
      throw new UnauthorizedException({
        error: 'invalid_grant',
        error_description: 'Associated session is no longer active',
      });
    }

    session.lastSeenAt = new Date();
    await this.sessionRepository.save(session);

    existingRefreshToken.revoked = true;
    existingRefreshToken.revokedAt = new Date();
    await this.tokenRepository.save(existingRefreshToken);

    const scope = dto.scope ?? existingRefreshToken.scopes.join(' ');
    return this.issueTokens({
      user: existingRefreshToken.user,
      client: session.client!,
      scope,
      session,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  private async ensureClient(clientId?: string, clientSecret?: string) {
    const defaultClientId =
      clientId ||
      this.configService.get<string>('DEFAULT_CLIENT_ID', 'first-party-app');
    let client = await this.clientRepository.findOne({
      where: { clientId: defaultClientId },
    });

    if (!client) {
      const secret =
        clientSecret ||
        this.configService.get<string>(
          'DEFAULT_CLIENT_SECRET',
          randomUUID(),
        );

      client = this.clientRepository.create({
        clientId: defaultClientId,
        clientSecret: secret,
        name: 'First Party Application',
        description: 'Auto-generated first party client',
        redirectUris: [],
        postLogoutRedirectUris: [],
        grants: ['password', 'refresh_token'],
        scopes: this.defaultScope.split(' '),
        firstParty: true,
        requirePkce: false,
        allowPlainPkce: false,
        enabled: true,
      });

      await this.clientRepository.save(client);
    } else if (!client.firstParty) {
      if (!clientSecret || client.clientSecret !== clientSecret) {
        throw new UnauthorizedException({
          error: 'invalid_client',
          error_description: 'Client authentication failed',
        });
      }
    }

    if (!client.enabled) {
      throw new ForbiddenException('OAuth client is disabled');
    }

    return client;
  }

  private async locateUser(identifier: string) {
    const where = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { phone: identifier };

    return this.userRepository.findOne({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  private ensureUserIsAllowed(user: User) {
    const status = user.status || UserStatus.PENDING;

    // 1. Blocked: Login disabled; secure appeal channel available
    if (status === UserStatus.BLOCKED) {
      throw new ForbiddenException({
        error: 'account_blocked',
        error_description: 'Account is blocked due to serious policy or security violations. A secure appeal channel is available.',
        appealAvailable: true,
        status: 'blocked',
      });
    }

    // 2. Deactivated: User has requested account deletion; restoration may be requested during 60-day recovery period
    if (status === UserStatus.DEACTIVATED) {
      const deactTime = user.deactivatedAt ? new Date(user.deactivatedAt).getTime() : Date.now();
      const expiresAt = new Date(deactTime + 60 * 24 * 60 * 60 * 1000);
      const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

      throw new ForbiddenException({
        error: 'account_deactivated',
        error_description: `Account has been deactivated. You may request account restoration within the ${daysLeft}-day recovery window.`,
        recoveryAvailable: daysLeft > 0,
        daysRemaining: daysLeft,
        status: 'deactivated',
        userId: user.userId,
      });
    }

    // 3. Closed: Account is permanently closed after the recovery period ends; normal access disabled
    if (status === UserStatus.CLOSED) {
      throw new ForbiddenException({
        error: 'account_closed',
        error_description: 'Account is permanently closed after the recovery period ended. Normal access is disabled.',
        status: 'closed',
      });
    }

    // 4. Allowed login with appropriate status flags (Image 1):
    // - Active: Operational and approved
    // - Pending: Limited dashboard access
    // - Under Review: View existing info and contact support; high-risk actions restricted
    // - Suspended: Access account status, support, and appeals
    // - Dormant: Reactivation verification required
  }

  private async ensureValidOtp(user: User, otp?: string) {
    const isEmailMethod = !user.twoFactorMethod || user.twoFactorMethod === 'email' || String(user.twoFactorMethod).toLowerCase() === 'email';
    const contact = isEmailMethod ? (user.email || user.phone) : (user.phone || user.email);

    if (!contact) {
      throw new UnauthorizedException({
        error: 'mfa_configuration_error',
        error_description: 'No contact method available for MFA',
      });
    }

    const otpKey = `otp:${contact}:2fa_login`;
    const fallbackKey = `otp:${contact}:login`;

    if (!otp) {
      const generatedOtp = this.otpUtil.generateOTP(6, contact);
      await this.otpUtil.storeOTP(this.redisClient, otpKey, generatedOtp);

      if (isEmailMethod && user.email) {
        await this.otpUtil.sendOTPEmail(user.email, generatedOtp, '2fa_login');
      } else if (user.phone) {
        await this.otpUtil.sendOTPSMS(user.phone, generatedOtp);
      } else if (contact) {
        await this.otpUtil.sendOTPEmail(contact, generatedOtp, '2fa_login');
      }

      throw new UnauthorizedException({
        error: 'mfa_required',
        error_description: 'OTP required for login',
        requiresOtp: true,
      });
    }

    let isValid = await this.otpUtil.verifyOTP(this.redisClient, otpKey, otp, false);
    if (!isValid) {
      isValid = await this.otpUtil.verifyOTP(this.redisClient, fallbackKey, otp, false);
    }

    if (!isValid) {
      throw new UnauthorizedException({
        error: 'invalid_otp',
        error_description: 'Invalid or expired OTP',
      });
    }
  }

  private async createSessionForUser(
    user: User,
    client: OAuthClient,
    context: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
      deviceName?: string;
      loginRole?: string;
    },
  ) {
    if (context.loginRole) {
      const existingSessions = await this.sessionRepository.find({
        where: {
          user: { id: user.id },
          loginRole: context.loginRole,
          active: true,
        },
      });

      if (existingSessions.length > 0) {
        for (const sess of existingSessions) {
          sess.active = false;
          sess.terminationReason = 'CONCURRENT_LOGIN';
          sess.terminatedAt = new Date();
        }
        await this.sessionRepository.save(existingSessions);

        const sessionIds = existingSessions.map(s => s.id);
        
        // Use query builder to bulk update tokens for these sessions to revoked=true
        await this.tokenRepository.createQueryBuilder()
          .update(OAuthToken)
          .set({ revoked: true, revokedAt: new Date() })
          .where("sessionId IN (:...sessionIds)", { sessionIds })
          .execute();
      }
    }

    const session = this.sessionRepository.create({
      user,
      client,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceId: context.deviceId,
      deviceName: context.deviceName,
      loginRole: context.loginRole,
      lastSeenAt: new Date(),
      active: true,
    });

    return this.sessionRepository.save(session);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(options: IssueTokenOptions) {
    const scope = options.scope || this.defaultScope;
    const scopesArray = scope.split(' ').filter(Boolean);

    const accessTokenResult = this.jwtService.signAccessToken({
      sub: options.user.userId,
      userId: options.user.userId,
      accountType: options.user.accountType,
      scope,
      sessionId: options.session.id,
      clientId: options.client.clientId,
      role:
        options.user.accountType === AccountType.BUSINESS
          ? 'business'
          : options.user.accountType === AccountType.AFFILIATE
            ? 'affiliate'
            : 'user',
    });

    const idTokenResult = this.jwtService.signIdToken({
      sub: options.user.userId,
      clientId: options.client.clientId,
      userId: options.user.userId,
      fullName: options.user.fullName,
      email: options.user.email,
      emailVerified: options.user.emailVerified,
      phone: options.user.phone,
      phoneVerified: options.user.phoneVerified,
      accountType: options.user.accountType,
      sessionId: options.session.id,
      scope,
    });

    const refreshToken = `${randomUUID()}${randomUUID()}`.replace(/-/g, '');
    const refreshTokenExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    const accessTokenEntity = this.tokenRepository.create({
      token: this.hashToken(accessTokenResult.token),
      tokenType: TokenType.ACCESS,
      scopes: scopesArray,
      expiresAt: accessTokenResult.expiresAt,
      user: options.user,
      client: options.client,
      sessionId: options.session.id,
      clientFingerprint: options.fingerprint,
      ipAddress: options.ipAddress,
    });

    const refreshTokenEntity = this.tokenRepository.create({
      token: this.hashToken(refreshToken),
      tokenType: TokenType.REFRESH,
      scopes: scopesArray,
      expiresAt: refreshTokenExpiresAt,
      user: options.user,
      client: options.client,
      sessionId: options.session.id,
      clientFingerprint: options.fingerprint,
      ipAddress: options.ipAddress,
    });

    await this.tokenRepository.save(accessTokenEntity);
    refreshTokenEntity.parentTokenId = accessTokenEntity.id;
    await this.tokenRepository.save(refreshTokenEntity);

    options.session.lastSeenAt = new Date();
    await this.sessionRepository.save(options.session);

    return {
      token_type: 'Bearer',
      expires_in: this.jwtService.getAccessTokenTtlSeconds(),
      scope,
      access_token: accessTokenResult.token,
      id_token: idTokenResult.token,
      refresh_token: refreshToken,
      user: {
        userId: options.user.userId,
        fullName: options.user.fullName,
        accountType: options.user.accountType,
        email: options.user.email,
        phone: options.user.phone,
        status: options.user.status,
        kycStatus: (options.user.kycStatus && options.user.kycStatus !== 'none')
          ? options.user.kycStatus
          : (((options.user as any).kycstatus && (options.user as any).kycstatus !== 'none')
              ? (options.user as any).kycstatus
              : (options.user.kycStatus || 'none')),
        profilePhoto: options.user.profilePhoto,
        idDocument: options.user.idDocument,
        nationality: options.user.nationality,
        dateOfBirth: options.user.dateOfBirth,
        governmentId: options.user.governmentId,
        governmentIdType: options.user.governmentIdType || 'NID',
        permanentAddress: options.user.permanentAddress,
        trustedIps: options.user.trustedIps || [],
        paymentMethods: options.user.paymentMethods || [],
        currency: options.user.currency,
        createdAt: options.user.createdAt,
      },
      session: {
        id: options.session.id,
        device_id: options.session.deviceId,
        device_name: options.session.deviceName,
        last_seen_at: options.session.lastSeenAt,
      },
    };
  }
}


