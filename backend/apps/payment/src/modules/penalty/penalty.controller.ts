import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { PenaltyService } from './penalty.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('penalties')
@UseGuards(JwtAuthGuard)
export class PenaltyController {
  constructor(private readonly penaltyService: PenaltyService) {}

  @Get('my')
  @HttpCode(HttpStatus.OK)
  async getMyPenalties(@Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    const penalties = await this.penaltyService.getPenaltiesForUser(userId);
    return {
      success: true,
      data: penalties,
    };
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  async payPenalty(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.penaltyService.payPenalty(userId, id);
  }

  @Get('admin/all')
  @HttpCode(HttpStatus.OK)
  async getAllPenalties() {
    const penalties = await this.penaltyService.getAllPenalties();
    return {
      success: true,
      data: penalties,
    };
  }

  @Post('admin/create')
  @HttpCode(HttpStatus.CREATED)
  async createPenalty(
    @Body()
    body: {
      userId: string;
      businessUserId?: string;
      reason: string;
      amount: number;
      currency?: string;
    },
  ) {
    const penalty = await this.penaltyService.createPenalty(body);
    return {
      success: true,
      data: penalty,
    };
  }
}
