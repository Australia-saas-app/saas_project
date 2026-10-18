import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentCampaign, CampaignStatus, RiskLevel } from '../../entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';

const DEFAULT_CAMPAIGNS: Partial<InvestmentCampaign>[] = [
  {
    campaignId: 'INV-2026-001',
    businessUserId: 'BUS-GLOBAL-01',
    businessName: 'Vero Ocean Technologies Pty',
    title: 'Autonomous Maritime Cargo Vessel Scaling',
    tagline: 'Next-generation AI navigation and zero-emission container shipping corridors across Asia-Pacific.',
    category: 'Maritime & Logistics',
    description: 'Scaling autonomous zero-emission maritime freight operations connecting Sydney, Singapore, and Yokohama. Backed by proprietary routing algorithms and certified hybrid propulsion.',
    targetAmount: 500000,
    raisedAmount: 345000,
    minInvestment: 500,
    maxInvestment: 50000,
    expectedRoiPercent: 16.5,
    termMonths: 24,
    riskLevel: RiskLevel.LOW,
    equityPercent: 8.5,
    investorCount: 42,
    status: CampaignStatus.ACTIVE,
    bannerUrl: '/image/banner.png',
  },
  {
    campaignId: 'INV-2026-002',
    businessUserId: 'BUS-TECH-04',
    businessName: 'AuraCloud Solutions',
    title: 'Enterprise Edge AI Inference Infrastructure',
    tagline: 'Ultra-low latency edge server clusters deployed across APAC industrial parks.',
    category: 'Technology',
    description: 'Deploying edge compute nodes to power computer-vision defect detection for tier-1 manufacturing plants. High recurring revenue with multi-year government infrastructure subsidies.',
    targetAmount: 250000,
    raisedAmount: 198000,
    minInvestment: 250,
    maxInvestment: 25000,
    expectedRoiPercent: 18.0,
    termMonths: 18,
    riskLevel: RiskLevel.MODERATE,
    equityPercent: 6.0,
    investorCount: 31,
    status: CampaignStatus.ACTIVE,
    bannerUrl: '/image/banner.png',
  },
  {
    campaignId: 'INV-2026-003',
    businessUserId: 'BUS-ESTATE-02',
    businessName: 'Horizon Eco-Residences Ltd',
    title: 'Brisbane Green Logistics Hub & Cold Storage',
    tagline: 'Solar-powered temperature-controlled automated warehousing facility near Brisbane Port.',
    category: 'Real Estate',
    description: 'Development of an automated 14,000 sqm cold-storage facility fully powered by rooftop solar and battery storage. 85% pre-leased to pharmaceutical and fresh produce exporters.',
    targetAmount: 750000,
    raisedAmount: 520000,
    minInvestment: 1000,
    maxInvestment: 100000,
    expectedRoiPercent: 14.0,
    termMonths: 36,
    riskLevel: RiskLevel.LOW,
    equityPercent: 12.0,
    investorCount: 58,
    status: CampaignStatus.ACTIVE,
    bannerUrl: '/image/banner.png',
  },
  {
    campaignId: 'INV-2026-004',
    businessUserId: 'BUS-CLEAN-09',
    businessName: 'Helios Renewable Energy',
    title: 'Commercial Micro-Grid & Battery Storage Expansion',
    tagline: 'Distributed solar and commercial storage networks providing reliable peak power in regional hubs.',
    category: 'Clean Energy',
    description: 'Financing the installation of 12 megawatt-hours of industrial battery storage linked to regional grid feeder stations with guaranteed feed-in tariff contracts.',
    targetAmount: 400000,
    raisedAmount: 400000,
    minInvestment: 500,
    maxInvestment: 50000,
    expectedRoiPercent: 15.2,
    termMonths: 24,
    riskLevel: RiskLevel.LOW,
    equityPercent: 7.5,
    investorCount: 64,
    status: CampaignStatus.FUNDED,
    bannerUrl: '/image/banner.png',
  },
];

@Injectable()
export class CampaignService implements OnModuleInit {
  constructor(
    @InjectRepository(InvestmentCampaign)
    private readonly campaignRepository: Repository<InvestmentCampaign>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.campaignRepository.count();
      if (count === 0) {
        for (const data of DEFAULT_CAMPAIGNS) {
          const c = this.campaignRepository.create(data);
          await this.campaignRepository.save(c);
        }
      }
    } catch (err) {
      console.warn('InvestmentCampaign seeding notice:', (err as any)?.message);
    }
  }

  async getCampaigns(query: any = {}): Promise<InvestmentCampaign[]> {
    const qb = this.campaignRepository.createQueryBuilder('c');

    if (query.category && query.category !== 'All') {
      qb.andWhere('LOWER(c.category) = LOWER(:cat)', { cat: query.category });
    }

    if (query.riskLevel && query.riskLevel !== 'All') {
      qb.andWhere('c.riskLevel = :risk', { risk: query.riskLevel });
    }

    if (query.status && query.status !== 'All') {
      qb.andWhere('c.status = :status', { status: query.status });
    }

    if (query.search) {
      const s = `%${query.search.toLowerCase()}%`;
      qb.andWhere('(LOWER(c.title) LIKE :s OR LOWER(c.tagline) LIKE :s OR LOWER(c.category) LIKE :s)', { s });
    }

    qb.orderBy('c.createdAt', 'DESC');
    const results = await qb.getMany();

    if (results.length === 0 && (!query.search && (!query.category || query.category === 'All'))) {
      return DEFAULT_CAMPAIGNS as InvestmentCampaign[];
    }

    return results;
  }

  async getCampaignById(id: string): Promise<InvestmentCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: [{ id }, { campaignId: id }],
    });
    if (!campaign) {
      // Check default campaigns fallback
      const found = DEFAULT_CAMPAIGNS.find((c) => c.id === id || c.campaignId === id);
      if (found) return found as InvestmentCampaign;
      throw new NotFoundException('Investment campaign not found');
    }
    return campaign;
  }

  async createCampaign(dto: CreateCampaignDto, businessUserId: string): Promise<InvestmentCampaign> {
    const campaignId = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const campaign = this.campaignRepository.create({
      ...dto,
      campaignId,
      businessUserId,
      raisedAmount: 0,
      investorCount: 0,
      status: CampaignStatus.ACTIVE,
      minInvestment: dto.minInvestment || 100,
      expectedRoiPercent: dto.expectedRoiPercent || 12.0,
      termMonths: dto.termMonths || 12,
      riskLevel: dto.riskLevel || RiskLevel.MODERATE,
      equityPercent: dto.equityPercent || 5.0,
    });
    return this.campaignRepository.save(campaign);
  }

  async updateCampaignStatus(id: string, status: CampaignStatus): Promise<InvestmentCampaign> {
    const campaign = await this.getCampaignById(id);
    campaign.status = status;
    return this.campaignRepository.save(campaign);
  }

  async getStats(): Promise<{
    totalTarget: number;
    totalRaised: number;
    activeCount: number;
    avgRoi: number;
    totalInvestors: number;
  }> {
    const campaigns = await this.campaignRepository.find();
    const list = campaigns.length > 0 ? campaigns : (DEFAULT_CAMPAIGNS as InvestmentCampaign[]);

    const totalTarget = list.reduce((sum, c) => sum + Number(c.targetAmount || 0), 0);
    const totalRaised = list.reduce((sum, c) => sum + Number(c.raisedAmount || 0), 0);
    const activeCount = list.filter((c) => c.status === CampaignStatus.ACTIVE).length;
    const avgRoi = list.length > 0 ? list.reduce((sum, c) => sum + Number(c.expectedRoiPercent || 0), 0) / list.length : 15.0;
    const totalInvestors = list.reduce((sum, c) => sum + Number(c.investorCount || 0), 0);

    return {
      totalTarget,
      totalRaised,
      activeCount,
      avgRoi: Number(avgRoi.toFixed(1)),
      totalInvestors,
    };
  }
}
