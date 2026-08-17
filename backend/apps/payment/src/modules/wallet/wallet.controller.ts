import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AddCardDto } from './dto/add-card.dto';
import { BuyDto } from './dto/buy.dto';
import { RefundDto } from './dto/refund.dto';
import { TransactionHistoryQueryDto } from './dto/transaction-history.dto';
import { OrderPaymentDto } from './dto/order-payment.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { CreateCheckoutSessionDto } from './dto/checkout.dto';
import { CheckoutService } from './services/checkout.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly checkoutService: CheckoutService,
  ) {}

  /**
   * Get wallet balance and details
   * GET /sso/wallet
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getWallet(@Request() req: any) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    if (req.user.accountType !== 'business') {
      throw new ForbiddenException('Only business users can view wallet balance');
    }
    return this.walletService.getWallet(req.user.userId);
  }


  /**
   * Add a payment card
   * POST /sso/wallet/cards
   */
  @Post('cards')
  @HttpCode(HttpStatus.CREATED)
  async addCard(@Request() req: any, @Body() addCardDto: AddCardDto) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.addCard(req.user.userId, addCardDto);
  }

  /**
   * Get all payment cards for the user
   * GET /sso/wallet/cards
   */
  @Get('cards')
  @HttpCode(HttpStatus.OK)
  async getCards(@Request() req: any) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.getCards(req.user.userId);
  }

  /**
   * Set a card as default
   * PATCH /sso/wallet/cards/:cardId/default
   */
  @Post('cards/:cardId/default')
  @HttpCode(HttpStatus.OK)
  async setDefaultCard(
    @Request() req: any,
    @Param('cardId', ParseIntPipe) cardId: number,
  ) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.setDefaultCard(req.user.userId, cardId);
  }

  /**
   * Delete a payment card
   * DELETE /sso/wallet/cards/:cardId
   */
  @Delete('cards/:cardId')
  @HttpCode(HttpStatus.OK)
  async deleteCard(
    @Request() req: any,
    @Param('cardId', ParseIntPipe) cardId: number,
  ) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    await this.walletService.deleteCard(req.user.userId, cardId);
    return { message: 'Card deleted successfully' };
  }

  /**
   * Buy/Add funds to wallet
   * POST /sso/wallet/buy
   */
  @Post('buy')
  @HttpCode(HttpStatus.CREATED)
  async buy(@Request() req: any, @Body() buyDto: BuyDto) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.buy(req.user.userId, buyDto);
  }

  /**
   * Deposit funds to wallet
   * POST /sso/wallet/deposit
   */
  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  async deposit(@Request() req: any, @Body() body: any) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    const buyDto: BuyDto = {
      amount: Number(body.amount),
      description: body.description || 'Wallet Deposit',
      cardId: body.paymentCardId || body.cardId,
      paymentMethod: body.method || 'card',
    };
    return this.walletService.buy(req.user.userId, buyDto);
  }

  /**
   * Refund a transaction
   * POST /sso/wallet/refund
   */
  @Post('refund')
  @HttpCode(HttpStatus.CREATED)
  async refund(@Request() req: any, @Body() refundDto: RefundDto) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.refund(req.user.userId, refundDto);
  }

  /**
   * Get transaction history
   * GET /sso/wallet/transactions
   */
  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  async getTransactionHistory(
    @Request() req: any,
    @Query() query: TransactionHistoryQueryDto,
  ) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    if (req.user.accountType !== 'business') {
      throw new ForbiddenException('Only business users can view wallet transactions');
    }
    return this.walletService.getTransactionHistory(req.user.userId, query);
  }

  /**
   * Buy/Add funds to wallet using Stripe
   * POST /sso/wallet/stripe/buy
   */
  @Post('stripe/buy')
  @HttpCode(HttpStatus.CREATED)
  async buyWithStripe(@Request() req: any, @Body() buyDto: BuyDto) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.buyWithStripe(req.user.userId, buyDto);
  }

  /**
   * Refund a transaction using Stripe
   * POST /sso/wallet/stripe/refund
   */
  @Post('stripe/refund')
  @HttpCode(HttpStatus.CREATED)
  async refundWithStripe(@Request() req: any, @Body() refundDto: RefundDto) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.refundWithStripe(req.user.userId, refundDto);
  }

  /**
   * Pay for order using wallet balance
   * POST /sso/wallet/pay/order/:orderCode
   */
  @Post('pay/order/:orderCode')
  @HttpCode(HttpStatus.CREATED)
  async payForOrder(
    @Request() req: any,
    @Param('orderCode') orderCode: string,
    @Body() orderPaymentDto: OrderPaymentDto,
  ) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.payForOrder(req.user.userId, orderCode, orderPaymentDto);
  }

  /**
   * Withdraw money from wallet
   * POST /sso/wallet/withdraw
   */
  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  async withdraw(@Request() req: any, @Body() withdrawDto: WithdrawDto) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.walletService.withdraw(req.user.userId, withdrawDto);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async createCheckoutSession(
    @Request() req: any,
    @Body() checkoutDto: CreateCheckoutSessionDto
  ) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.checkoutService.createCheckoutSession(checkoutDto, req.user.userId);
  }

  @Get('checkout/:sessionId')
  async getCheckoutSession(@Param('sessionId') sessionId: string, @Query('gateway') gateway: 'stripe' | 'paypal' = 'stripe') {
    return this.checkoutService.getCheckoutSession(sessionId, gateway);
  }

  @Delete('checkout/:sessionId')
  async cancelCheckoutSession(@Param('sessionId') sessionId: string, @Query('gateway') gateway: 'stripe' | 'paypal' = 'stripe') {
    return this.checkoutService.cancelCheckoutSession(sessionId, gateway);
  }

}

