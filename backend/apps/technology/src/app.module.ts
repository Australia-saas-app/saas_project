import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { MongooseModule } from '@nestjs/mongoose';
import { TechnologyModule } from './technology/technology.module';
import { HealthModule } from './health/health.module';
import { TechnicalService } from './technology/entities/technical-service.entity';
import { TechnicalCategory } from './technology/entities/technical-category.entity';
import { ServiceTaxonomy } from './technology/entities/service-taxonomy.entity';
import { Project } from './technology/entities/project.entity';
import { ProjectTask } from './technology/entities/project-task.entity';
import { ProjectParticipant } from './technology/entities/project-participant.entity';
import { ProjectMessage } from './technology/entities/project-message.entity';
import { ProjectProposal } from './technology/entities/project-proposal.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../config/env.example'].filter(Boolean),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          process.env.MONGODB_URI ||
          'mongodb://localhost:27017/saas_db',
      }),
      inject: [ConfigService],
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
          genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
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
          TechnicalService,
          TechnicalCategory,
          ServiceTaxonomy,
          Project,
          ProjectTask,
          ProjectParticipant,
          ProjectMessage,
          ProjectProposal,
        ],
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    TechnologyModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
