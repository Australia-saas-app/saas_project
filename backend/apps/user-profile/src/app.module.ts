import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ThrottlerModule,
  ThrottlerGuard,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { ProfileModule } from './profile/profile.module';
import { PreferencesModule } from './preferences/preferences.module';
import { ActivityModule } from './activity/activity.module';
import { UserProfile } from './profile/entities/user-profile.entity';
import { UserContact } from './profile/entities/user-contact.entity';
import { UserPreference } from './preferences/entities/user-preference.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../config/env.example'].filter(Boolean),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv =
          configService.get('NODE_ENV') || process.env.NODE_ENV || 'production';
        const isProduction = nodeEnv === 'production';

        const pinoHttpConfig: any = {
          level: isProduction ? 'info' : 'debug',
          genReqId: (req) =>
            (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
        };

        if (!isProduction) {
          try {
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
    // PostgreSQL connection for user profiles and preferences
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_NAME', 'vero2'),
        entities: [UserProfile, UserContact, UserPreference],
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    // MongoDB connection for activity logs (GCP Cloud Mongo / Atlas / Multi-env support)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>('MONGODB_URI') ||
          configService.get<string>('MONGO_URI') ||
          configService.get<string>('DATABASE_URL') ||
          'mongodb://localhost:27017/vero2';

        const dbName = configService.get<string>('MONGODB_DB_NAME', 'vero2');

        return {
          uri: mongoUri,
          dbName,
          retryAttempts: 5,
          retryDelay: 3000,
          serverSelectionTimeoutMS: 10000,
        };
      },
      inject: [ConfigService],
    }),
    CommonModule,
    HealthModule,
    ProfileModule,
    PreferencesModule,
    ActivityModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
