import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { TokenModule } from './modules/token/token.module';
import { SessionModule } from './modules/session/session.module';
import { RedisModule } from './redis/redis.module';
import { AuthorizeModule } from './modules/authorize/authorize.module';
import { AuthModule } from './modules/auth/auth.module';
import { User } from './entities/user.entity';
import { OAuthClient } from './entities/oauth-client.entity';
import { OAuthAuthorizationCode } from './entities/oauth-authorization-code.entity';
import { OAuthToken } from './entities/oauth-token.entity';
import { UserSession } from './entities/user-session.entity';
import { MfaSecret } from './entities/mfa-secret.entity';
import { UserConsent } from './entities/user-consent.entity';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { Activity } from './entities/activity.entity';
import { Notification } from './entities/notification.entity';
import { WalletModule } from './modules/wallet/wallet.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ActivityLog } from './entities/activity-log.entity';
import { Admin } from './entities/admin.entity';
import { ChatTopic } from './entities/chat-topic.entity';
import { AuditTrail } from './entities/audit-trail.entity';
import { Conversation } from './entities/conversation.entity';
import { PredefinedMessage } from './entities/predefined-message.entity';
import { SystemEvent } from './entities/system-event.entity';
import { PaymentCard } from './entities/payment-card.entity';
import { AffiliateIncome } from './entities/affiliate-income.entity';
import { SecurityDeposit } from './entities/security-deposit.entity';
import { KycApplication } from './entities/kyc-application.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        '../.env',
        '../../.env',
        '../../../.env',
        '../backend/.env',
      ].filter(Boolean),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get('NODE_ENV') || process.env.NODE_ENV || 'production';
        const isProduction = nodeEnv === 'production';

        const pinoConfig: any = {
          level: isProduction ? 'info' : 'debug',
          genReqId: (req: any) =>
            (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
        };

        // Only use pino-pretty in development (it's a dev dependency, not in production)
        if (!isProduction) {
          try {
            require.resolve('pino-pretty');
            pinoConfig.transport = { target: 'pino-pretty', options: { singleLine: true } };
          } catch {
            // pino-pretty not available, skip transport (will use default JSON)
          }
        }

        return {
          pinoHttp: pinoConfig,
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: Number(configService.get('RATE_LIMIT_TTL') ?? 60),
            limit: Number(configService.get('RATE_LIMIT_MAX') ?? 100),
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_NAME', 'vero2'),
        entities: [
          User,
          OAuthClient,
          OAuthAuthorizationCode,
          OAuthToken,
          UserSession,
          MfaSecret,
          UserConsent,
          Wallet,
          Transaction,
          Activity,
          Notification,
          ActivityLog,
          Admin,
          ChatTopic,
          AuditTrail,
          Conversation,
          SystemEvent,
          PredefinedMessage,
          PaymentCard,
          AffiliateIncome,
          SecurityDeposit,
          KycApplication,
        ],
        synchronize:
          String(configService.get('SSO_SYNCHRONIZE', 'true')).toLowerCase() === 'true',
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    DiscoveryModule,
    TokenModule,
    SessionModule,
    AuthorizeModule,
    AuthModule,
    WalletModule,
    NotificationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly autoMigrateLogger = new Logger('DatabaseAutoMigration');

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TYPE users_status_enum ADD VALUE IF NOT EXISTS 'under_review';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
          BEGIN
            ALTER TYPE users_status_enum ADD VALUE IF NOT EXISTS 'deactivated';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
          BEGIN
            ALTER TYPE user_status_enum ADD VALUE IF NOT EXISTS 'under_review';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
          BEGIN
            ALTER TYPE user_status_enum ADD VALUE IF NOT EXISTS 'deactivated';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END $$;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "trustedIps" JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "recoveryKey" VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "kycStatus" VARCHAR(50) DEFAULT 'none';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "statusHistory" JSONB;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "agencyInfo" JSONB;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "businessInfo" JSONB;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "governmentId" VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "governmentIdType" VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "paymentMethods" JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP DEFAULT NOW();
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP DEFAULT NOW();
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP;
      `);
      this.autoMigrateLogger.log('Users table schema verified and auto-migrated successfully.');
    } catch (e: any) {
      this.autoMigrateLogger.warn(`Database auto-migration note: ${e?.message || e}`);
    }
  }
}


