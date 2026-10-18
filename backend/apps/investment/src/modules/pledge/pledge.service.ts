import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InvestmentPledge, PledgeStatus } from '../../entities/pledge.entity';
import { InvestmentCampaign, CampaignStatus } from '../../entities/campaign.entity';
import { InvestmentDividend } from '../../entities/dividend.entity';
import { CreatePledgeDto } from './dto/create-pledge.dto';

@Injectable()
export class PledgeService {
  constructor(
    @InjectRepository(InvestmentPledge)
    private readonly pledgeRepository: Repository<InvestmentPledge>,
    @InjectRepository(InvestmentCampaign)
    private readonly campaignRepository: Repository<InvestmentCampaign>,
    @InjectRepository(InvestmentDividend)
    private readonly dividendRepository: Repository<InvestmentDividend>,
    private readonly dataSource: DataSource,
  ) {}

  async createPledge(
    dto: CreatePledgeDto,
    user: { userId: string; email?: string; name?: string },
  ): Promise<{
    success: boolean;
    message: string;
    pledge: InvestmentPledge;
    campaign: InvestmentCampaign;
    projectedAnnualReturn: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const campaign = await queryRunner.manager.findOne(InvestmentCampaign, {
        where: [{ id: dto.campaignId }, { campaignId: dto.campaignId }],
      });

      if (!campaign) {
        throw new NotFoundException('Investment campaign not found');
      }

      if (campaign.status !== CampaignStatus.ACTIVE) {
        throw new BadRequestException(`This campaign is currently ${campaign.status.toLowerCase()} and cannot accept new pledges.`);
      }

      const amount = Number(dto.amount);
      if (amount < Number(campaign.minInvestment)) {
        throw new BadRequestException(`Minimum investment amount is $${campaign.minInvestment}`);
      }

      if (campaign.maxInvestment && amount > Number(campaign.maxInvestment)) {
        throw new BadRequestException(`Maximum investment amount is $${campaign.maxInvestment}`);
      }

      const targetAmount = Number(campaign.targetAmount);
      const equityPercent = Number(campaign.equityPercent || 5.0);
      const equityShare = targetAmount > 0 ? (amount / targetAmount) * equityPercent : 0;

      const pledgeId = `PLG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const txnId = `TXN-INV-${Date.now()}`;

      const pledge = queryRunner.manager.create(InvestmentPledge, {
        pledgeId,
        campaignId: campaign.campaignId,
        investorUserId: user.userId,
        investorName: user.name || 'Verified Investor',
        investorEmail: user.email || '',
        amount,
        currency: (dto.currency || 'USD').toUpperCase(),
        equitySharePercent: Number(equityShare.toFixed(3)),
        status: PledgeStatus.CONFIRMED,
        paymentMethod: dto.paymentMethod || 'wallet',
        transactionId: txnId,
        totalDividendsPaid: 0,
      });

      const savedPledge = await queryRunner.manager.save(pledge);

      // Update campaign raisedAmount & investorCount
      const newRaised = Number(campaign.raisedAmount || 0) + amount;
      campaign.raisedAmount = newRaised;
      campaign.investorCount = (campaign.investorCount || 0) + 1;

      if (newRaised >= targetAmount) {
        campaign.status = CampaignStatus.FUNDED;
      }
      await queryRunner.manager.save(campaign);

      await queryRunner.commitTransaction();

      const projectedAnnualReturn = Number(
        ((amount * Number(campaign.expectedRoiPercent || 12.0)) / 100).toFixed(2)
      );

      return {
        success: true,
        message: `Pledge of $${amount} successfully confirmed for "${campaign.title}"`,
        pledge: savedPledge,
        campaign,
        projectedAnnualReturn,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyPledges(userId: string): Promise<{
    pledges: (InvestmentPledge & { campaign?: InvestmentCampaign })[];
    summary: {
      totalInvested: number;
      totalDividends: number;
      activeCampaignsCount: number;
      estimatedAnnualYield: number;
    };
  }> {
    const pledges = await this.pledgeRepository.find({
      where: { investorUserId: userId },
      order: { createdAt: 'DESC' },
    });

    const campaignIds = Array.from(new Set(pledges.map((p) => p.campaignId)));
    let campaigns: InvestmentCampaign[] = [];
    if (campaignIds.length > 0) {
      campaigns = await this.campaignRepository.find({
        where: campaignIds.map((cid) => ({ campaignId: cid })),
      });
    }

    const pledgesWithCampaigns = pledges.map((p) => {
      const c = campaigns.find((camp) => camp.campaignId === p.campaignId);
      return {
        ...p,
        campaign: c,
      };
    });

    const totalInvested = pledges.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalDividends = pledges.reduce((sum, p) => sum + Number(p.totalDividendsPaid || 0), 0);
    const activeCampaignsCount = pledges.filter((p) => p.status === PledgeStatus.CONFIRMED).length;
    const estimatedAnnualYield = pledges.reduce((sum, p) => {
      const c = campaigns.find((camp) => camp.campaignId === p.campaignId);
      const roi = Number(c?.expectedRoiPercent || 12.0);
      return sum + (Number(p.amount) * roi) / 100;
    }, 0);

    return {
      pledges: pledgesWithCampaigns,
      summary: {
        totalInvested,
        totalDividends,
        activeCampaignsCount,
        estimatedAnnualYield: Number(estimatedAnnualYield.toFixed(2)),
      },
    };
  }

  async getCampaignPledges(campaignId: string): Promise<InvestmentPledge[]> {
    return this.pledgeRepository.find({
      where: [{ campaignId }, { campaignId: campaignId.toUpperCase() }],
      order: { createdAt: 'DESC' },
    });
  }

  async distributeDividend(
    campaignId: string,
    totalDividendAmount: number,
  ): Promise<{ success: boolean; distributedCount: number; totalDistributed: number }> {
    const campaign = await this.campaignRepository.findOne({
      where: [{ campaignId }, { id: campaignId }],
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const pledges = await this.pledgeRepository.find({
      where: { campaignId: campaign.campaignId, status: PledgeStatus.CONFIRMED },
    });

    if (pledges.length === 0) {
      throw new BadRequestException('No confirmed pledges found for this campaign');
    }

    const totalPledged = pledges.reduce((sum, p) => sum + Number(p.amount), 0);
    let distributedCount = 0;

    for (const pledge of pledges) {
      const share = Number(pledge.amount) / totalPledged;
      const investorDividend = Number((totalDividendAmount * share).toFixed(2));

      if (investorDividend > 0) {
        const dividend = this.dividendRepository.create({
          dividendId: `DIV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          campaignId: campaign.campaignId,
          investorUserId: pledge.investorUserId,
          pledgeId: pledge.pledgeId,
          amount: investorDividend,
          currency: pledge.currency || 'USD',
          roiRate: Number(campaign.expectedRoiPercent || 0),
          status: 'DISTRIBUTED',
          transactionId: `TXN-DIV-${Date.now()}`,
        });
        await this.dividendRepository.save(dividend);

        pledge.totalDividendsPaid = Number(pledge.totalDividendsPaid || 0) + investorDividend;
        await this.pledgeRepository.save(pledge);
        distributedCount++;
      }
    }

    return {
      success: true,
      distributedCount,
      totalDistributed: totalDividendAmount,
    };
  }
}
