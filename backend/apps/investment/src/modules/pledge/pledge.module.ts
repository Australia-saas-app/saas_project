import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentPledge } from '../../entities/pledge.entity';
import { InvestmentCampaign } from '../../entities/campaign.entity';
import { InvestmentDividend } from '../../entities/dividend.entity';
import { PledgeService } from './pledge.service';
import { PledgeController } from './pledge.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestmentPledge,
      InvestmentCampaign,
      InvestmentDividend,
    ]),
  ],
  controllers: [PledgeController],
  providers: [PledgeService],
  exports: [PledgeService],
})
export class PledgeModule {}
