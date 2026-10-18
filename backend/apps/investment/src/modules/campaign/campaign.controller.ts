import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CampaignStatus } from '../../entities/campaign.entity';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  async getCampaigns(@Query() query: any) {
    return this.campaignService.getCampaigns(query);
  }

  @Get('stats')
  async getStats() {
    return this.campaignService.getStats();
  }

  @Get(':id')
  async getCampaignById(@Param('id') id: string) {
    return this.campaignService.getCampaignById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createCampaign(@Body() dto: CreateCampaignDto, @Request() req: any) {
    const businessUserId = req.user?.userId || req.user?.sub || 'BUS-DEMO-01';
    return this.campaignService.createCampaign(dto, businessUserId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: CampaignStatus,
  ) {
    return this.campaignService.updateCampaignStatus(id, status);
  }
}
