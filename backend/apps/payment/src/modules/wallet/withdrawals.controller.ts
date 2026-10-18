import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { WithdrawalRequestDto } from './dto/withdrawal-request.dto';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
export class WithdrawalsController {
  constructor(private readonly walletService: WalletService) {}

  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async requestWithdrawal(@Request() req: any, @Body() dto: WithdrawalRequestDto) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.requestWithdrawal(req.user.userId, req.user.accountType, dto);
  }

  @Get('my')
  @HttpCode(HttpStatus.OK)
  async getMyWithdrawals(@Request() req: any) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.getMyWithdrawals(req.user.userId, req.user.accountType);
  }

  @Get('admin/requests')
  @HttpCode(HttpStatus.OK)
  async getAllWithdrawalRequests() {
    return this.walletService.getAllWithdrawalRequests();
  }

  @Post('admin/:id/pay')
  @HttpCode(HttpStatus.OK)
  async payWithdrawal(@Param('id') id: string, @Request() req: any, @Body() body: { note?: string }) {
    const adminId = req.user?.userId || req.user?.id || 'admin';
    return this.walletService.payWithdrawalRequest(id, adminId, body?.note);
  }

  @Post('admin/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectWithdrawal(@Param('id') id: string, @Request() req: any, @Body() body: { reason?: string }) {
    const adminId = req.user?.userId || req.user?.id || 'admin';
    return this.walletService.rejectWithdrawalRequest(id, adminId, body?.reason);
  }
}

