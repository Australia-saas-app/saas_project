import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PledgeService } from './pledge.service';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('pledges')
export class PledgeController {
  constructor(private readonly pledgeService: PledgeService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPledge(@Body() dto: CreatePledgeDto, @Request() req: any) {
    const user = {
      userId: req.user?.userId || req.user?.sub || 'USR-INVESTOR-01',
      email: req.user?.email || 'investor@testcorp.com',
      name: req.user?.name || req.user?.fullName || 'Verified Investor',
    };
    return this.pledgeService.createPledge(dto, user);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyPledges(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || 'USR-INVESTOR-01';
    return this.pledgeService.getMyPledges(userId);
  }

  @Get('campaign/:campaignId')
  @UseGuards(JwtAuthGuard)
  async getCampaignPledges(@Param('campaignId') campaignId: string) {
    return this.pledgeService.getCampaignPledges(campaignId);
  }

  @Post('campaign/:campaignId/distribute-dividend')
  @UseGuards(JwtAuthGuard)
  async distributeDividend(
    @Param('campaignId') campaignId: string,
    @Body('amount') amount: number,
  ) {
    return this.pledgeService.distributeDividend(campaignId, Number(amount));
  }
}
