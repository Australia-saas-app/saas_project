import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('wallet')
@Controller('sso/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get wallet details' })
  async getWallet(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.getWallet(userId);
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get wallet balance and summary' })
  async getBalance(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.getWalletSummary(userId);
  }

  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all saved payment methods from database' })
  async getPaymentMethods(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.getPaymentMethods(userId);
  }

  @Post('payment-methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Save or update payment method in database' })
  async savePaymentMethod(@Request() req: any, @Body() body: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.savePaymentMethod(userId, body);
  }

  @Delete('payment-methods/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a payment method from database' })
  async deletePaymentMethod(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const success = await this.walletService.deletePaymentMethod(userId, id);
    return { success, message: success ? 'Payment method deleted' : 'Payment method not found' };
  }

  @Post('payment-methods/:id/default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Set default payout method in database' })
  async setDefaultPaymentMethod(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const updated = await this.walletService.setDefaultPaymentMethod(userId, id);
    return { success: Boolean(updated), method: updated };
  }

  @Get('cards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get saved payment cards' })
  async getCards(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.getCards(userId);
  }

  @Post('cards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a new payment card' })
  async addCard(
    @Request() req: any,
    @Body()
    body: {
      cardHolderName: string;
      cardNumber: string;
      expiryMonth: string;
      expiryYear: string;
      cardBrand?: string;
      isDefault?: boolean;
    },
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.addCard(userId, body);
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deposit to wallet' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        description: { type: 'string' },
        method: { type: 'string' },
        paymentCardId: { type: 'number' },
        cardData: { type: 'object' },
      },
    },
  })
  async deposit(
    @Request() req: any,
    @Body()
    body: {
      amount: number;
      description?: string;
      method?: string;
      paymentCardId?: number;
      cardData?: any;
    },
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.deposit(userId, body.amount, body.description, {
      cardData: body.cardData,
      paymentCardId: body.paymentCardId,
      method: body.method,
    });
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Withdraw from wallet' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        description: { type: 'string' },
        method: { type: 'string' },
      },
    },
  })
  async withdraw(@Request() req: any, @Body() body: { amount: number; description?: string; method?: string }) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.withdraw(userId, body.amount, body.description, body.method);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'all', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  async getTransactions(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('all') all?: string,
    @Query('type') type?: string,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const userRole = String(req.user?.role || req.user?.accountType || '').toUpperCase();
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole.includes('ADMIN');
    const isAll = all === 'true' || all === '1' || (isAdmin && !userId);
    return await this.walletService.getTransactions(userId, page, limit, isAll, type);
  }

  @Get('admin/withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all withdrawal requests for admin' })
  async getAdminWithdrawals() {
    return await this.walletService.getAllWithdrawalRequests();
  }

  @Post('admin/withdrawals/:id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve withdrawal request' })
  async approveWithdrawal(@Param('id') id: string) {
    return await this.walletService.updateWithdrawalStatus(id, 'approve');
  }

  @Post('admin/withdrawals/:id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject withdrawal request' })
  async rejectWithdrawal(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return await this.walletService.updateWithdrawalStatus(id, 'reject', body?.reason);
  }

  @Post('withdrawals/:id/revert')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revert pending withdrawal request within 24 hours' })
  async revertWithdrawal(@Request() req: any, @Param('id') id: string, @Body() body?: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || body?.userId;
    return await this.walletService.revertWithdrawal(userId, id);
  }

  @Post('admin/withdrawals/:id/revert')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin revert withdrawal request' })
  async adminRevertWithdrawal(@Param('id') id: string) {
    return await this.walletService.revertWithdrawal('admin', id);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create wallet for user' })
  async createWallet(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.createWallet(userId);
  }

  @Post('internal/deduct')
  @ApiOperation({ summary: 'Internal microservice wallet deduct' })
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
  @ApiOperation({ summary: 'Internal microservice wallet credit' })
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