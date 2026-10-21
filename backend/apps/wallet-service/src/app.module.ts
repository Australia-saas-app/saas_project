import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { WalletModule } from './modules/wallet/wallet.module';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../backend/.env'].filter(Boolean),
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
        database: configService.get('DB_NAME', 'vero2_wallet'),
        entities: [
          User,
          Wallet,
          Transaction,
        ],
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    WalletModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}