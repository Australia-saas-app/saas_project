import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignModule } from './modules/campaign/campaign.module';
import { PledgeModule } from './modules/pledge/pledge.module';
import { InvestmentCampaign } from './entities/campaign.entity';
import { InvestmentPledge } from './entities/pledge.entity';
import { InvestmentDividend } from './entities/dividend.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../config/env.example'].filter(Boolean),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'saas-postgres'),
        port: parseInt(configService.get<string>('DB_PORT', '5432'), 10),
        username: configService.get<string>('DB_USERNAME', 'admin'),
        password: configService.get<string>('DB_PASSWORD', 'adminpassword'),
        database: configService.get<string>('DB_NAME', 'saas_db'),
        entities: [InvestmentCampaign, InvestmentPledge, InvestmentDividend],
        synchronize: true, // Auto-create tables in dev/production
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    CampaignModule,
    PledgeModule,
  ],
})
export class AppModule {}
