import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getWallet(@Request() req: any) {
    const userId = req.user.userId;
    return await this.walletService.getWallet(userId);
  }

  @Get('balance')
  async getBalance(@Request() req: any) {
    const userId = req.user.userId;
    const balance = await this.walletService.getBalance(userId);
    return { balance };
  }

  @Post('deposit')
  async deposit(@Request() req: any, @Body() body: { amount: number; description?: string }) {
    const userId = req.user.userId;
    return await this.walletService.deposit(userId, body.amount, body.description);
  }

  @Post('withdraw')
  async withdraw(@Request() req: any, @Body() body: { amount: number; description?: string }) {
    const userId = req.user.userId;
    return await this.walletService.withdraw(userId, body.amount, body.description);
  }

  @Get('transactions')
  async getTransactions(@Request() req: any, @Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    const userId = req.user.userId;
    return await this.walletService.getTransactions(userId, page, limit);
  }

  @Post('create')
  async createWallet(@Request() req: any) {
    const userId = req.user.userId;
    return await this.walletService.createWallet(userId);
  }

  @Post('refund')
  async refund(@Request() req: any, @Body() body: { amount: number; description?: string }) {
    const userId = req.user.userId;
    return await this.walletService.refund(userId, body.amount, body.description);
  }

  @Post('adjust')
  async adjustBalance(@Request() req: any, @Body() body: { adjustment: number; description?: string }) {
    const userId = req.user.userId;
    return await this.walletService.adjustBalance(userId, body.adjustment, body.description);
  }

  @Get('analytics')
  async getAnalytics(@Request() req: any) {
    const userId = req.user.userId;
    return await this.walletService.getWalletAnalytics(userId);
  }

  @Post('check-fraud')
  async checkFraud(@Request() req: any, @Body() body: { amount: number }) {
    const userId = req.user.userId;
    const isFraud = await this.walletService.checkFraud(userId, body.amount);
    return { isFraud };
  }

  @Post('integrate')
  async integrate(@Request() req: any, @Body() body: { service: string; data: any }) {
    const userId = req.user.userId;
    return await this.walletService.integrateWithService(userId, body.service, body.data);
  }

  @Post('internal/deduct')
  async internalDeduct(
    @Body() body: { userId: string; amount: number; description?: string; reference?: string },
  ) {
    try {
      const wallet = await this.walletService.withdraw(
        body.userId,
        body.amount,
        body.description || `Deduction ref: ${body.reference || ''}`,
      );
      return { success: true, balance: wallet.balance };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Post('internal/credit')
  async internalCredit(
    @Body() body: { userId: string; amount: number; description?: string; reference?: string },
  ) {
    try {
      const wallet = await this.walletService.deposit(
        body.userId,
        body.amount,
        body.description || `Credit ref: ${body.reference || ''}`,
      );
      return { success: true, balance: wallet.balance };
    } catch (e: any) {
      try {
        await this.walletService.createWallet(body.userId);
        const wallet = await this.walletService.deposit(body.userId, body.amount, body.description);
        return { success: true, balance: wallet.balance };
      } catch (e2: any) {
        return { success: false, message: e2.message };
      }
    }
  }
}