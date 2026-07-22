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

    const session = await this.createSessionForUser(user, client, {
      deviceId: dto.device_id,
      deviceName: dto.device_name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    return this.issueTokens({
      user,
      client,
      scope,
      session,
      ipAddress: req.ip,
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
    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.PENDING) {
      throw new ForbiddenException({
        error: user.status.toLowerCase(),
        error_description: `Account is ${user.status.toLowerCase()}`,
      });
    }
  }

  private async ensureValidOtp(user: User, otp?: string) {
    const contact =
      user.twoFactorMethod === 'email' ? user.email : user.phone;

    if (!contact) {
      throw new UnauthorizedException({
        error: 'mfa_configuration_error',
        error_description: 'No contact method available for MFA',
      });
    }

    const otpKey = `otp:${contact}:login`;

    if (!otp) {
      const generatedOtp = this.otpUtil.generateOTP();
      await this.otpUtil.storeOTP(this.redisClient, otpKey, generatedOtp);

      if (user.twoFactorMethod === 'email') {
        await this.otpUtil.sendOTPEmail(contact, generatedOtp);
      } else {
        await this.otpUtil.sendOTPSMS(contact, generatedOtp);
      }

      throw new UnauthorizedException({
        error: 'mfa_required',
        error_description: 'OTP required for login',
        requiresOtp: true,
      });
    }

    const isValid = await this.otpUtil.verifyOTP(this.redisClient, otpKey, otp);
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
    },
  ) {
    const session = this.sessionRepository.create({
      user,
      client,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceId: context.deviceId,
      deviceName: context.deviceName,
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
          : options.user.accountType === AccountType.AGENCY
            ? 'agency'
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
        kycStatus: options.user.kycStatus,
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


