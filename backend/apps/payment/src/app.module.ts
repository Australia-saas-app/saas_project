import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { HealthModule } from './health/health.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { SecurityDepositModule } from './modules/security-deposit/security-deposit.module';
import { AffiliateIncomeModule } from './modules/affiliate-income/affiliate-income.module';
import { AdminModule } from './modules/admin/admin.module';
import { TaxModule } from './modules/tax/tax.module';
import { PenaltyModule } from './modules/penalty/penalty.module';
import { PenaltyRecord } from './modules/penalty/entities/penalty-record.entity';
import { Wallet } from './entities/wallet.entity';
import { User } from './entities/user.entity';
import { PaymentCard } from './entities/payment-card.entity';
import { Transaction } from './entities/transaction.entity';
import { SecurityDeposit } from './entities/security-deposit.entity';
import { AffiliateIncome } from './entities/affiliate-income.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../config/env.example'].filter(Boolean),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get('NODE_ENV') || process.env.NODE_ENV || 'production';
        const isProduction = nodeEnv === 'production';
        
        // Only use pino-pretty in development when explicitly not in production
        // This prevents errors when pino-pretty is not available in production builds
        const pinoHttpConfig: any = {
          level: isProduction ? 'info' : 'debug',
          genReqId: (req) =>
            (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
        };
        
        // Only add transport in non-production environments
        // pino-pretty is a dev dependency and not available in production
        if (!isProduction) {
          try {
            // Check if pino-pretty is available (it's a dev dependency)
            require.resolve('pino-pretty');
            pinoHttpConfig.transport = {
              target: 'pino-pretty',
              options: { singleLine: true },
            };
          } catch {
            // pino-pretty not available, use default JSON logging
          }
        }
        
        return { pinoHttp: pinoHttpConfig };
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
          Wallet,
          PaymentCard,
          Transaction,
          SecurityDeposit,
          AffiliateIncome,
          WithdrawalRequest,
          PenaltyRecord,
        ],
        synchronize: true, // Auto-create tables (set to false in production after initial setup)
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    WalletModule,
    HealthModule,
    SecurityDepositModule,
    AffiliateIncomeModule,
    AdminModule,
    TaxModule,
    PenaltyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

