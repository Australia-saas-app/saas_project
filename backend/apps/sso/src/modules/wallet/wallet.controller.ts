import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get wallet balance' })
  async getBalance(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const balance = await this.walletService.getBalance(userId);
    return { balance };
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
      },
    },
  })
  async withdraw(@Request() req: any, @Body() body: { amount: number; description?: string }) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.withdraw(userId, body.amount, body.description);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(@Request() req: any, @Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return await this.walletService.getTransactions(userId, page, limit);
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