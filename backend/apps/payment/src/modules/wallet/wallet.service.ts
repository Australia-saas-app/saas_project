import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import axios, { AxiosInstance } from 'axios';
import { Wallet } from '../../entities/wallet.entity';
import { PaymentCard, CardStatus } from '../../entities/payment-card.entity';
import { User, AccountType } from '../../entities/user.entity';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../entities/transaction.entity';
import {
  WithdrawalRequest,
  WithdrawalRequestStatus,
} from '../../entities/withdrawal-request.entity';
import { AddCardDto } from './dto/add-card.dto';
import { BuyDto } from './dto/buy.dto';
import { RefundDto } from './dto/refund.dto';
import { TransactionHistoryQueryDto } from './dto/transaction-history.dto';
import { OrderPaymentDto } from './dto/order-payment.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import {
  CreatePayPalProjectOrderDto,
  ProjectPaymentKind,
  StripeProjectCheckoutDto,
} from './dto/project-payment.dto';
import { WithdrawalRequestDto } from './dto/withdrawal-request.dto';
import { randomBytes } from 'crypto';
import { PayPalService } from './services/paypal.service';

@Injectable()
export class WalletService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(WalletService.name);
  private readonly httpClient: AxiosInstance;

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(PaymentCard)
    private readonly paymentCardRepository: Repository<PaymentCard>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRequestRepository: Repository<WithdrawalRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly paypalService: PayPalService,
  ) {
    // Initialize Stripe
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY is not configured. Stripe integration will not work.');
    } else {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16' as any,
      });
      this.logger.log('Stripe initialized successfully');
    }

    // Initialize HTTP client for order service
    const orderServiceUrl = this.configService.get<string>('ORDER_SERVICE_URL') || 'http://localhost:3003/api/orders';
    const orderServiceTimeout = this.configService.get<number>('ORDER_SERVICE_TIMEOUT') || 10000;
    this.httpClient = axios.create({
      baseURL: orderServiceUrl,
      timeout: orderServiceTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get or create wallet for a user
   */
  async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        balance: 0,
        currency: this.configService.get<string>('WALLET_DEFAULT_CURRENCY') || 'USD',
        isActive: true,
      });

      wallet = await this.walletRepository.save(wallet);
    }

    return wallet;
  }

  /**
   * Get wallet balance and details
   */
  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet;
  }

  /**
   * Add a payment card
   */
  async addCard(userId: string, addCardDto: AddCardDto): Promise<PaymentCard> {
    // In production, this would integrate with Stripe/PayPal to tokenize the card
    // For now, we'll simulate by creating a card entity

    // Extract last 4 digits
    const last4 = addCardDto.cardNumber.slice(-4);

    // Determine card brand (simplified logic)
    let cardBrand = 'Unknown';
    if (addCardDto.cardNumber.startsWith('4')) {
      cardBrand = 'Visa';
    } else if (addCardDto.cardNumber.startsWith('5')) {
      cardBrand = 'Mastercard';
    } else if (addCardDto.cardNumber.startsWith('3')) {
      cardBrand = 'American Express';
    } else if (addCardDto.cardNumber.startsWith('6')) {
      cardBrand = 'Discover';
    }

    // If this is set as default, unset other default cards
    if (addCardDto.isDefault) {
      await this.paymentCardRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    } else {
      // If no default card exists, make this one default
      const existingDefault = await this.paymentCardRepository.findOne({
        where: { userId, isDefault: true },
      });
      if (!existingDefault) {
        addCardDto.isDefault = true;
      }
    }

    // Generate a mock token (in production, use Stripe/PayPal API)
    const encryptedCardToken = `card_token_${randomBytes(16).toString('hex')}`;

    const card = this.paymentCardRepository.create({
      userId,
      cardHolderName: addCardDto.cardHolderName,
      last4,
      cardBrand,
      cardType: addCardDto.cardType,
      expiryMonth: addCardDto.expiryMonth,
      expiryYear: addCardDto.expiryYear,
      encryptedCardToken,
      status: CardStatus.ACTIVE,
      isDefault: addCardDto.isDefault ?? false,
      billingAddress: addCardDto.billingAddress,
      billingCity: addCardDto.billingCity,
      billingState: addCardDto.billingState,
      billingZipCode: addCardDto.billingZipCode,
      billingCountry: addCardDto.billingCountry,
    });

    return await this.paymentCardRepository.save(card);
  }

  /**
   * Get all payment cards for a user
   */
  async getCards(userId: string): Promise<PaymentCard[]> {
    return await this.paymentCardRepository.find({
      where: { userId, status: CardStatus.ACTIVE },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Set a card as default
   */
  async setDefaultCard(userId: string, cardId: number): Promise<PaymentCard> {
    const card = await this.paymentCardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    if (card.status !== CardStatus.ACTIVE) {
      throw new BadRequestException('Only active cards can be set as default');
    }

    // Unset all other default cards
    await this.paymentCardRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    // Set this card as default
    card.isDefault = true;
    return await this.paymentCardRepository.save(card);
  }

  /**
   * Delete a payment card
   */
  async deleteCard(userId: string, cardId: number): Promise<void> {
    const card = await this.paymentCardRepository.findOne({
      where: { id: cardId, userId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    await this.paymentCardRepository.remove(card);

    // If we deleted the default card, set the first remaining card as default
    if (card.isDefault) {
      const firstCard = await this.paymentCardRepository.findOne({
        where: { userId, status: CardStatus.ACTIVE },
        order: { createdAt: 'ASC' },
      });

      if (firstCard) {
        firstCard.isDefault = true;
        await this.paymentCardRepository.save(firstCard);
      }
    }
  }

  /**
   * Process a purchase/buy transaction (add funds to wallet)
   */
  async buy(userId: string, buyDto: BuyDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get or create wallet
      const wallet = await this.getOrCreateWallet(userId);
      
      // Ensure wallet is active
      if (!wallet.isActive) {
        throw new BadRequestException('Wallet is not active');
      }

      // Use wallet currency or provided currency
      const currency = buyDto.currency || wallet.currency;

      // Get payment card if specified
      let card: PaymentCard | null = null;
      if (buyDto.cardId) {
        card = await this.paymentCardRepository.findOne({
          where: { id: buyDto.cardId, userId },
        });
        if (!card) {
          throw new NotFoundException('Payment card not found');
        }
        if (card.status !== CardStatus.ACTIVE) {
          throw new BadRequestException('Payment card is not active');
        }
      } else {
        // Get default card, or first available card if no default is set
        card = await this.paymentCardRepository.findOne({
          where: { userId, isDefault: true, status: CardStatus.ACTIVE },
        });

        // If no default card, get the first available card
        if (!card) {
          card = await this.paymentCardRepository.findOne({
            where: { userId, status: CardStatus.ACTIVE },
            order: { createdAt: 'ASC' },
          });

          // If we found a card, automatically set it as default
          if (card) {
            // Unset all other default cards first (within transaction)
            await queryRunner.manager.update(
              PaymentCard,
              { userId, isDefault: true },
              { isDefault: false },
            );
            // Set this card as default
            card.isDefault = true;
            await queryRunner.manager.save(card);
          }
        }
      }

      if (!card) {
        throw new BadRequestException('No payment card available. Please add a card first.');
      }

      // In production, this would call Stripe/PayPal API to process payment
      // For now, we'll simulate a successful payment
      const paymentProviderTransactionId = `pay_${randomBytes(16).toString('hex')}`;

      // Generate unique transaction ID
      const transactionId = `TXN_${Date.now()}_${randomBytes(8).toString('hex').toUpperCase()}`;

      // Record balance before
      const balanceBefore = Number(wallet.balance);

      // Create transaction record
      const transaction = this.transactionRepository.create({
        transactionId,
        walletId: wallet.id,
        userId,
        type: TransactionType.DEPOSIT,
        amount: buyDto.amount,
        currency,
        status: TransactionStatus.PENDING,
        description: buyDto.description || 'Wallet top-up',
        paymentMethod: buyDto.paymentMethod || 'card',
        paymentProvider: 'stripe', // In production, determine from card
        paymentProviderTransactionId,
        paymentCardId: card.id,
        referenceId: buyDto.referenceId,
        balanceBefore,
      });

      await queryRunner.manager.save(transaction);

      // Update wallet balance
      const balanceAfter = balanceBefore + Number(buyDto.amount);
      wallet.balance = balanceAfter;
      transaction.balanceAfter = balanceAfter;
      transaction.status = TransactionStatus.COMPLETED;

      await queryRunner.manager.save(wallet);
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Reload transaction with relations
      const savedTransaction = await this.transactionRepository.findOne({
        where: { id: transaction.id },
        relations: ['wallet'],
      });

      if (!savedTransaction) {
        throw new Error('Transaction was not found after creation');
      }

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process a refund transaction
   */
  async refund(userId: string, refundDto: RefundDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find original transaction
      const originalTransaction = await this.transactionRepository.findOne({
        where: {
          transactionId: refundDto.transactionId,
          userId,
        },
        relations: ['wallet'],
      });

      if (!originalTransaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Only refund DEPOSIT or PAYMENT transactions
      if (
        originalTransaction.type !== TransactionType.DEPOSIT &&
        originalTransaction.type !== TransactionType.PAYMENT
      ) {
        throw new BadRequestException('Only deposit and payment transactions can be refunded');
      }

      // Check if already refunded
      if (originalTransaction.status === TransactionStatus.REFUNDED) {
        throw new BadRequestException('Transaction has already been refunded');
      }

      if (originalTransaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException('Only completed transactions can be refunded');
      }

      // Determine refund amount
      const refundAmount = refundDto.amount || Number(originalTransaction.amount);

      if (refundAmount > Number(originalTransaction.amount)) {
        throw new BadRequestException('Refund amount cannot exceed original transaction amount');
      }

      // Get wallet
      const wallet = originalTransaction.wallet;
      if (!wallet || wallet.userId !== userId) {
        throw new ForbiddenException('Unauthorized to refund this transaction');
      }

      // Ensure wallet has sufficient balance for refund
      if (wallet.balance < refundAmount) {
        throw new BadRequestException('Insufficient wallet balance for refund');
      }

      // Generate unique transaction ID for refund
      const refundTransactionId = `TXN_REFUND_${Date.now()}_${randomBytes(8).toString('hex').toUpperCase()}`;

      // Record balance before
      const balanceBefore = Number(wallet.balance);

      // Create refund transaction
      const refundTransaction = this.transactionRepository.create({
        transactionId: refundTransactionId,
        walletId: wallet.id,
        userId,
        type: TransactionType.REFUND,
        amount: refundAmount,
        currency: originalTransaction.currency,
        status: TransactionStatus.PENDING,
        description: `Refund for transaction ${refundDto.transactionId}${refundDto.reason ? `: ${refundDto.reason}` : ''}`,
        paymentMethod: originalTransaction.paymentMethod,
        paymentProvider: originalTransaction.paymentProvider,
        paymentProviderTransactionId: originalTransaction.paymentProviderTransactionId,
        paymentCardId: originalTransaction.paymentCardId,
        referenceId: originalTransaction.transactionId,
        balanceBefore,
      });

      await queryRunner.manager.save(refundTransaction);

      // Update wallet balance (subtract refund amount)
      const balanceAfter = balanceBefore - refundAmount;
      wallet.balance = balanceAfter;
      refundTransaction.balanceAfter = balanceAfter;
      refundTransaction.status = TransactionStatus.COMPLETED;

      // Update original transaction status
      originalTransaction.status = TransactionStatus.REFUNDED;

      await queryRunner.manager.save(wallet);
      await queryRunner.manager.save(refundTransaction);
      await queryRunner.manager.save(originalTransaction);

      await queryRunner.commitTransaction();

      // Reload transaction with relations
      const savedRefundTransaction = await this.transactionRepository.findOne({
        where: { id: refundTransaction.id },
        relations: ['wallet'],
      });

      if (!savedRefundTransaction) {
        throw new Error('Refund transaction was not found after creation');
      }

      return savedRefundTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(
    userId: string,
    query: TransactionHistoryQueryDto,
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Get wallet to ensure user has one
    await this.getOrCreateWallet(userId);

    // Build query
    const whereConditions: any = { userId };

    if (query.type) {
      whereConditions.type = query.type;
    }

    if (query.status) {
      whereConditions.status = query.status;
    }

    if (query.startDate || query.endDate) {
      if (query.startDate && query.endDate) {
        whereConditions.createdAt = Between(
          new Date(query.startDate),
          new Date(query.endDate),
        );
      } else if (query.startDate) {
        whereConditions.createdAt = MoreThanOrEqual(new Date(query.startDate));
      } else if (query.endDate) {
        whereConditions.createdAt = LessThanOrEqual(new Date(query.endDate));
      }
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: whereConditions,
      relations: ['wallet'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  /**
   * Get all transactions (admin)
   */
  async getAllTransactions(
    query: TransactionHistoryQueryDto,
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (query.type) {
      whereConditions.type = query.type;
    }

    if (query.status) {
      whereConditions.status = query.status;
    }

    if (query.startDate || query.endDate) {
      if (query.startDate && query.endDate) {
        whereConditions.createdAt = Between(
          new Date(query.startDate),
          new Date(query.endDate),
        );
      } else if (query.startDate) {
        whereConditions.createdAt = MoreThanOrEqual(new Date(query.startDate));
      } else if (query.endDate) {
        whereConditions.createdAt = LessThanOrEqual(new Date(query.endDate));
      }
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: whereConditions,
      relations: ['wallet'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  /**
   * Get transaction by ID (admin)
   */
  async getTransactionById(transactionId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { transactionId:transactionId },
      relations: ['wallet'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
    }

    return transaction;
  }

  /**
   * Process a purchase/buy transaction using Stripe
   * This method creates an actual Stripe charge
   */
  async buyWithStripe(userId: string, buyDto: BuyDto): Promise<Transaction> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get or create wallet
      const wallet = await this.getOrCreateWallet(userId);
      
      // Ensure wallet is active
      if (!wallet.isActive) {
        throw new BadRequestException('Wallet is not active');
      }

      // Use wallet currency or provided currency
      const currency = (buyDto.currency || wallet.currency).toLowerCase();

      // Get payment card if specified (optional for testing)
      let card: PaymentCard | null = null;
      if (buyDto.cardId) {
        card = await this.paymentCardRepository.findOne({
          where: { id: buyDto.cardId, userId },
        });
        if (!card) {
          throw new NotFoundException('Payment card not found');
        }
        if (card.status !== CardStatus.ACTIVE) {
          throw new BadRequestException('Payment card is not active');
        }
      } else {
        // Get default card
        card = await this.paymentCardRepository.findOne({
          where: { userId, isDefault: true, status: CardStatus.ACTIVE },
        });

        if (!card) {
          card = await this.paymentCardRepository.findOne({
            where: { userId, status: CardStatus.ACTIVE },
            order: { createdAt: 'ASC' },
          });
        }
      }

      // For testing: If no card is available, we'll use a test payment method
      // In production, a card should be required
      const useTestCard = !card;

      // Generate unique transaction ID
      const transactionId = `TXN_${Date.now()}_${randomBytes(8).toString('hex').toUpperCase()}`;

      // Record balance before
      const balanceBefore = Number(wallet.balance);

      // Create transaction record with PENDING status first
      const transaction = this.transactionRepository.create({
        transactionId,
        walletId: wallet.id,
        userId,
        type: TransactionType.DEPOSIT,
        amount: buyDto.amount,
        currency,
        status: TransactionStatus.PENDING,
        description: buyDto.description || 'Wallet top-up via Stripe',
        paymentMethod: buyDto.paymentMethod || 'card',
        paymentProvider: 'stripe',
        paymentCardId: card?.id || undefined,
        referenceId: buyDto.referenceId,
        balanceBefore,
      });

      await queryRunner.manager.save(transaction);

      // Create Stripe charge
      let stripeCharge: Stripe.Charge;
      try {
        let paymentMethodId: string;
        
        if (useTestCard) {
          // For testing: Use Stripe test token directly
          // This allows testing without adding a card first
          this.logger.log('Using Stripe test token for buy (no card required for testing)');
          
          // Use Stripe test token - tok_visa always succeeds
          // See: https://stripe.com/docs/testing#cards
          paymentMethodId = 'tok_visa'; // Test token for Visa card that always succeeds
        } else {
          // Use existing card's payment method
          if (!card) {
            throw new BadRequestException('Card is required but not found');
          }
          
          paymentMethodId = card.encryptedCardToken;
          
          // If it's not a Stripe payment method ID or token, use test token
          // Note: In production, always use payment method IDs created via Stripe Elements
          if (!paymentMethodId.startsWith('pm_') && !paymentMethodId.startsWith('tok_')) {
            this.logger.warn('Using Stripe test token. In production, use payment method IDs from Stripe Elements.');
            // Use Stripe test token for testing
            paymentMethodId = 'tok_visa'; // Test token that always succeeds
          }
        }

        // Create charge or payment intent based on token type
        if (paymentMethodId.startsWith('tok_')) {
          // Use Charges API directly with test token
          this.logger.log('Creating charge with Stripe test token');
          stripeCharge = await this.stripe.charges.create({
            amount: Math.round(buyDto.amount * 100), // Convert to cents
            currency: currency,
            source: paymentMethodId, // Use test token as source
            description: buyDto.description || 'Wallet top-up',
            metadata: {
              userId,
              walletId: wallet.id.toString(),
              transactionId,
              referenceId: buyDto.referenceId || '',
            },
          });
        } else {
          // Use Payment Intents API with payment method ID
          const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(buyDto.amount * 100), // Convert to cents
            currency: currency,
            payment_method: paymentMethodId,
            confirm: true,
            description: buyDto.description || 'Wallet top-up',
            metadata: {
              userId,
              walletId: wallet.id.toString(),
              transactionId,
              referenceId: buyDto.referenceId || '',
            },
          });

          // Get the charge from payment intent
          const chargeId = typeof paymentIntent.latest_charge === 'string' 
            ? paymentIntent.latest_charge 
            : paymentIntent.latest_charge?.id;

          if (!chargeId) {
            throw new BadRequestException('Payment failed: No charge ID returned from Stripe');
          }

          // Retrieve the charge to get full details
          stripeCharge = await this.stripe.charges.retrieve(chargeId);
        }

        // Check if payment was successful
        if (stripeCharge.status !== 'succeeded') {
          throw new BadRequestException(`Payment failed with status: ${stripeCharge.status}`);
        }

        // Update transaction with Stripe charge ID
        transaction.paymentProviderTransactionId = stripeCharge.id;
        transaction.status = TransactionStatus.COMPLETED;

        // Update wallet balance
        const balanceAfter = balanceBefore + Number(buyDto.amount);
        wallet.balance = balanceAfter;
        transaction.balanceAfter = balanceAfter;

        await queryRunner.manager.save(wallet);
        await queryRunner.manager.save(transaction);

        await queryRunner.commitTransaction();

        this.logger.log(`Stripe charge successful: ${stripeCharge.id} for transaction ${transactionId}`);

        // Reload transaction with relations
        const savedTransaction = await this.transactionRepository.findOne({
          where: { id: transaction.id },
          relations: ['wallet'],
        });

        if (!savedTransaction) {
          throw new Error('Transaction was not found after creation');
        }

        return savedTransaction;
      } catch (error) {
        // Handle Stripe errors
        if (error instanceof Stripe.errors.StripeError) {
          this.logger.error(`Stripe error: ${error.message}`, error.stack);
          
          // Update transaction with failure
          transaction.status = TransactionStatus.FAILED;
          transaction.failureReason = error.message;
          try {
            await queryRunner.manager.save(transaction);
            await queryRunner.commitTransaction();
          } catch (saveError) {
            this.logger.error(`Failed to save transaction: ${saveError.message}`);
            // Only rollback if transaction is active
            if (queryRunner.isTransactionActive) {
              try {
                await queryRunner.rollbackTransaction();
              } catch (rollbackError) {
                this.logger.error(`Failed to rollback transaction: ${rollbackError.message}`);
              }
            }
          }
          throw new BadRequestException(`Stripe payment failed: ${error.message}`);
        }
        throw error;
      }
    } catch (error) {
      // Only rollback if transaction is active
      if (queryRunner.isTransactionActive) {
        try {
          await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
          this.logger.error(`Failed to rollback transaction: ${rollbackError.message}`);
        }
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process a refund transaction using Stripe
   * This method creates an actual Stripe refund
   */
  async refundWithStripe(userId: string, refundDto: RefundDto): Promise<Transaction> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find original transaction
      const originalTransaction = await this.transactionRepository.findOne({
        where: {
          transactionId: refundDto.transactionId,
          userId,
        },
        relations: ['wallet'],
      });

      if (!originalTransaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Only refund DEPOSIT or PAYMENT transactions
      if (
        originalTransaction.type !== TransactionType.DEPOSIT &&
        originalTransaction.type !== TransactionType.PAYMENT
      ) {
        throw new BadRequestException('Only deposit and payment transactions can be refunded');
      }

      // Check if already refunded
      if (originalTransaction.status === TransactionStatus.REFUNDED) {
        throw new BadRequestException('Transaction has already been refunded');
      }

      if (originalTransaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException('Only completed transactions can be refunded');
      }

      // Check if it's a Stripe transaction
      if (originalTransaction.paymentProvider !== 'stripe') {
        throw new BadRequestException('This transaction was not processed with Stripe');
      }

      // Get Stripe charge ID
      const stripeChargeId = originalTransaction.paymentProviderTransactionId;
      if (!stripeChargeId || !stripeChargeId.startsWith('ch_')) {
        throw new BadRequestException('Invalid Stripe charge ID in transaction');
      }

      // Determine refund amount
      const refundAmount = refundDto.amount || Number(originalTransaction.amount);

      if (refundAmount > Number(originalTransaction.amount)) {
        throw new BadRequestException('Refund amount cannot exceed original transaction amount');
      }

      // Get wallet
      const wallet = originalTransaction.wallet;
      if (!wallet || wallet.userId !== userId) {
        throw new ForbiddenException('Unauthorized to refund this transaction');
      }

      // Generate unique transaction ID for refund
      const refundTransactionId = `TXN_REFUND_${Date.now()}_${randomBytes(8).toString('hex').toUpperCase()}`;

      // Record balance before
      const balanceBefore = Number(wallet.balance);

      // Create refund transaction with PENDING status
      const refundTransaction = this.transactionRepository.create({
        transactionId: refundTransactionId,
        walletId: wallet.id,
        userId,
        type: TransactionType.REFUND,
        amount: refundAmount,
        currency: originalTransaction.currency,
        status: TransactionStatus.PENDING,
        description: `Refund for transaction ${refundDto.transactionId}${refundDto.reason ? `: ${refundDto.reason}` : ''}`,
        paymentMethod: originalTransaction.paymentMethod,
        paymentProvider: 'stripe',
        paymentProviderTransactionId: stripeChargeId,
        paymentCardId: originalTransaction.paymentCardId,
        referenceId: originalTransaction.transactionId,
        balanceBefore,
      });

      await queryRunner.manager.save(refundTransaction);

      // Process Stripe refund
      let stripeRefund: Stripe.Refund;
      try {
        stripeRefund = await this.stripe.refunds.create({
          charge: stripeChargeId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: refundDto.reason ? 'requested_by_customer' : undefined,
          metadata: {
            userId,
            walletId: wallet.id.toString(),
            originalTransactionId: refundDto.transactionId,
            refundTransactionId,
            refundReason: refundDto.reason || '',
          },
        });

        // Update refund transaction with Stripe refund ID
        refundTransaction.paymentProviderTransactionId = stripeRefund.id;
        refundTransaction.metadata = {
          stripeRefundId: stripeRefund.id,
          stripeRefundStatus: stripeRefund.status,
          originalChargeId: stripeChargeId,
        };

        // Check refund status
        if (stripeRefund.status === 'succeeded') {
          refundTransaction.status = TransactionStatus.COMPLETED;
          
          // Update wallet balance (subtract refund amount)
          const balanceAfter = balanceBefore - refundAmount;
          wallet.balance = balanceAfter;
          refundTransaction.balanceAfter = balanceAfter;

          // Check if this is a full refund
          const totalRefunded = await this.transactionRepository
            .createQueryBuilder('transaction')
            .where('transaction.referenceId = :refId', { refId: originalTransaction.transactionId })
            .andWhere('transaction.type = :type', { type: TransactionType.REFUND })
            .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
            .select('SUM(transaction.amount)', 'total')
            .getRawOne();

          const totalRefundedAmount = Number(totalRefunded?.total || 0) + refundAmount;

          if (totalRefundedAmount >= Number(originalTransaction.amount)) {
            originalTransaction.status = TransactionStatus.REFUNDED;
          }
        } else if (stripeRefund.status === 'pending') {
          refundTransaction.status = TransactionStatus.PENDING;
          // Don't update wallet balance for pending refunds
        } else {
          refundTransaction.status = TransactionStatus.FAILED;
          refundTransaction.failureReason = `Stripe refund status: ${stripeRefund.status}`;
        }

        await queryRunner.manager.save(wallet);
        await queryRunner.manager.save(refundTransaction);
        await queryRunner.manager.save(originalTransaction);

        await queryRunner.commitTransaction();

        this.logger.log(`Stripe refund successful: ${stripeRefund.id} for charge ${stripeChargeId}`);

        // Reload transaction with relations
        const savedRefundTransaction = await this.transactionRepository.findOne({
          where: { id: refundTransaction.id },
          relations: ['wallet'],
        });

        if (!savedRefundTransaction) {
          throw new Error('Refund transaction was not found after creation');
        }

        return savedRefundTransaction;
      } catch (error) {
        // Handle Stripe errors
        if (error instanceof Stripe.errors.StripeError) {
          this.logger.error(`Stripe refund error: ${error.message}`, error.stack);
          
          // Update refund transaction with failure
          refundTransaction.status = TransactionStatus.FAILED;
          refundTransaction.failureReason = error.message;
          await queryRunner.manager.save(refundTransaction);
          
          await queryRunner.rollbackTransaction();
          
          // Check specific error types
          if (error.code === 'charge_already_refunded') {
            throw new BadRequestException('This charge has already been refunded in Stripe');
          }
          throw new BadRequestException(`Stripe refund failed: ${error.message}`);
        }
        throw error;
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Pay for order using wallet balance
   * Deducts amount from wallet and calls order service
   */
  async payForOrder(userId: string, orderCode: string, orderPaymentDto: OrderPaymentDto): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get wallet
      const wallet = await this.getOrCreateWallet(userId);
      
      if (!wallet.isActive) {
        throw new BadRequestException('Wallet is not active');
      }

      // Determine payment amount (if not provided, will need to fetch from order service)
      // For now, require amount to be provided
      if (!orderPaymentDto.amount || orderPaymentDto.amount <= 0) {
        throw new BadRequestException('Payment amount is required and must be greater than 0');
      }

      const paymentAmount = Number(orderPaymentDto.amount);
      const currency = wallet.currency || 'USD';

      // Validate sufficient balance
      if (Number(wallet.balance) < paymentAmount) {
        throw new BadRequestException(`Insufficient wallet balance. Available: ${wallet.balance} ${currency}, Required: ${paymentAmount} ${currency}`);
      }

      // Generate unique transaction ID
      const transactionId = `TXN_${Date.now()}_${randomBytes(8).toString('hex').toUpperCase()}`;

      // Record balance before
      const balanceBefore = Number(wallet.balance);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        transactionId,
        walletId: wallet.id,
        userId,
        type: TransactionType.PAYMENT,
        amount: paymentAmount,
        currency,
        status: TransactionStatus.PENDING,
        description: orderPaymentDto.description || `Payment for order ${orderCode}`,
        paymentMethod: 'wallet',
        paymentProvider: 'wallet',
        referenceId: orderCode,
        balanceBefore,
        metadata: {
          orderCode,
          paymentType: 'order_payment',
        },
      });

      await queryRunner.manager.save(transaction);

      // Deduct from wallet
      const balanceAfter = balanceBefore - paymentAmount;
      wallet.balance = balanceAfter;
      transaction.balanceAfter = balanceAfter;

      await queryRunner.manager.save(wallet);

      // Call order service to update payment status
      try {
        // Note: This requires an admin token or order service should accept user tokens
        // For now, we'll make the call and handle errors gracefully
        await this.httpClient.post(`/admin/${orderCode}/payments`, {
          amount: paymentAmount,
          currency: currency,
          method: 'wallet',
          transactionId: transactionId,
          status: 'succeeded',
          paidAt: new Date().toISOString(),
        });

        this.logger.log(`Order payment successful for order ${orderCode}: ${paymentAmount} ${currency}`);
      } catch (orderServiceError: any) {
        this.logger.warn(`Failed to update order service for ${orderCode}: ${orderServiceError.message}`);
        // Continue anyway - transaction is already recorded
        // In production, you might want to implement a retry mechanism
      }

      // Update transaction status to completed
      transaction.status = TransactionStatus.COMPLETED;
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      // Reload transaction with relations
      const savedTransaction = await this.transactionRepository.findOne({
        where: { id: transaction.id },
        relations: ['wallet'],
      });

      if (!savedTransaction) {
        throw new Error('Transaction was not found after creation');
      }

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error paying for order ${orderCode}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process payment for order: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Withdraw money from wallet
   * Uses Stripe for transfers (works in test and production)
   */
  async withdraw(userId: string, withdrawDto: WithdrawDto): Promise<Transaction> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get wallet
      const wallet = await this.getOrCreateWallet(userId);
      
      if (!wallet.isActive) {
        throw new BadRequestException('Wallet is not active');
      }

      const withdrawalAmount = Number(withdrawDto.amount);
      const currency = (withdrawDto.currency || wallet.currency || 'USD').toLowerCase();

      // Validate minimum withdrawal
      const minWithdrawal = Number(this.configService.get<string>('WALLET_MIN_WITHDRAWAL') || '20.00');
      if (withdrawalAmount < minWithdrawal) {
        throw new BadRequestException(`Minimum withdrawal amount is ${minWithdrawal} ${currency}`);
      }

      // Validate maximum withdrawal
      const maxWithdrawal = Number(this.configService.get<string>('WALLET_MAX_WITHDRAWAL') || '5000.00');
      if (withdrawalAmount > maxWithdrawal) {
        throw new BadRequestException(`Maximum withdrawal amount is ${maxWithdrawal} ${currency}`);
      }

      // Validate sufficient balance
      if (Number(wallet.balance) < withdrawalAmount) {
        throw new BadRequestException(`Insufficient wallet balance. Available: ${wallet.balance} ${currency}, Required: ${withdrawalAmount} ${currency}`);
      }

      // Generate unique transaction ID
      const transactionId = `WTH_${Date.now()}_${randomBytes(8).toString('hex').toUpperCase()}`;

      // Record balance before
      const balanceBefore = Number(wallet.balance);

      // Create transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        transactionId,
        walletId: wallet.id,
        userId,
        type: TransactionType.WITHDRAWAL,
        amount: withdrawalAmount,
        currency,
        status: TransactionStatus.PENDING,
        description: withdrawDto.description || `Withdrawal to ${withdrawDto.withdrawalMethod}`,
        paymentMethod: withdrawDto.withdrawalMethod,
        paymentProvider: 'stripe',
        balanceBefore,
        metadata: {
          withdrawalMethod: withdrawDto.withdrawalMethod,
          accountDetails: withdrawDto.accountDetails || {},
        },
      });

      await queryRunner.manager.save(transaction);

      // Process withdrawal via Stripe
      try {
        // For test mode: Create a transfer (in production, you'd use Stripe Connect)
        // In test mode, we can create a transfer to a test account
        // In production, you'd need Stripe Connect to transfer to user's bank account

        const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
        const isTestMode = stripeSecretKey.startsWith('sk_test_');

        if (isTestMode) {
          // Test mode: Create a test transfer or payment
          // For now, we'll just record the transaction and mark it as completed
          // In a real implementation, you'd:
          // 1. Create a Stripe Connect account for the user (if not exists)
          // 2. Transfer funds to that account
          // 3. User then withdraws from their Stripe account to their bank

          this.logger.log(`Test mode withdrawal for ${withdrawalAmount} ${currency} - transaction recorded`);
          
          // In test mode, we simulate successful withdrawal
          // In production, you'd use Stripe Connect:
          // const transfer = await this.stripe.transfers.create({
          //   amount: Math.round(withdrawalAmount * 100),
          //   currency: currency,
          //   destination: userStripeAccountId,
          //   metadata: {
          //     userId,
          //     transactionId,
          //   },
          // });
          
          transaction.status = TransactionStatus.COMPLETED;
          transaction.paymentProviderTransactionId = `test_withdrawal_${transactionId}`;
        } else {
          // Production mode: Use Stripe Connect to transfer to user's account
          // This requires implementing Stripe Connect first
          // For now, we'll throw an error asking for Stripe Connect setup
          throw new BadRequestException('Production withdrawals require Stripe Connect setup. Please configure user Stripe Connect accounts.');
        }

        // Deduct from wallet
        const balanceAfter = balanceBefore - withdrawalAmount;
        wallet.balance = balanceAfter;
        transaction.balanceAfter = balanceAfter;

        await queryRunner.manager.save(wallet);
        await queryRunner.manager.save(transaction);

        await queryRunner.commitTransaction();

        this.logger.log(`Withdrawal successful: ${transactionId} - ${withdrawalAmount} ${currency}`);

        // Reload transaction with relations
        const savedTransaction = await this.transactionRepository.findOne({
          where: { id: transaction.id },
          relations: ['wallet'],
        });

        if (!savedTransaction) {
          throw new Error('Transaction was not found after creation');
        }

        return savedTransaction;
      } catch (stripeError: any) {
        // Handle Stripe errors
        if (stripeError instanceof Stripe.errors.StripeError) {
          this.logger.error(`Stripe withdrawal error: ${stripeError.message}`, stripeError.stack);
          
          transaction.status = TransactionStatus.FAILED;
          transaction.failureReason = stripeError.message;
          await queryRunner.manager.save(transaction);
          
          await queryRunner.rollbackTransaction();
          
          throw new BadRequestException(`Withdrawal failed: ${stripeError.message}`);
        }
        throw stripeError;
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error processing withdrawal: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process withdrawal: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async createStripeProjectCheckout(
    payerUserId: string,
    dto: StripeProjectCheckoutDto,
  ): Promise<Record<string, any>> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }
    await this.validateBusinessUser(dto.businessUserId);
    const businessWallet = await this.getOrCreateWallet(dto.businessUserId);
    if (!businessWallet.isActive) {
      throw new BadRequestException('Business wallet is not active');
    }

    const transactionId = this.generateTransactionId('PRJ');
    const currency = (dto.currency || businessWallet.currency || 'USD').toLowerCase();
    const amount = Number(dto.amount);

    const transaction = this.transactionRepository.create({
      transactionId,
      walletId: businessWallet.id,
      userId: dto.businessUserId,
      type: TransactionType.DEPOSIT,
      amount,
      currency,
      status: TransactionStatus.PENDING,
      description: dto.description || 'Project payment via Stripe',
      paymentMethod: 'card',
      paymentProvider: 'stripe',
      referenceId: dto.projectId,
      balanceBefore: Number(businessWallet.balance),
      metadata: {
        payerUserId,
        businessUserId: dto.businessUserId,
        projectId: dto.projectId || null,
        milestoneId: dto.milestoneId || null,
        paymentKind: dto.paymentKind || ProjectPaymentKind.ONE_TIME,
      },
    });
    await this.transactionRepository.save(transaction);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      automatic_payment_methods: { enabled: true },
      description: transaction.description || undefined,
      metadata: {
        internal_transaction_id: transactionId,
        business_user_id: dto.businessUserId,
        payer_user_id: payerUserId,
        project_id: dto.projectId || '',
        milestone_id: dto.milestoneId || '',
        payment_kind: dto.paymentKind || ProjectPaymentKind.ONE_TIME,
      },
    });

    transaction.paymentProviderTransactionId = paymentIntent.id;
    await this.transactionRepository.save(transaction);

    return {
      transactionId,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: currency.toUpperCase(),
      status: transaction.status,
    };
  }

  async createPayPalProjectOrder(
    payerUserId: string,
    dto: CreatePayPalProjectOrderDto,
  ): Promise<Record<string, any>> {
    await this.validateBusinessUser(dto.businessUserId);
    const businessWallet = await this.getOrCreateWallet(dto.businessUserId);
    if (!businessWallet.isActive) {
      throw new BadRequestException('Business wallet is not active');
    }

    const transactionId = this.generateTransactionId('PRJ');
    const currency = (dto.currency || businessWallet.currency || 'USD').toUpperCase();
    const amount = Number(dto.amount);

    const transaction = this.transactionRepository.create({
      transactionId,
      walletId: businessWallet.id,
      userId: dto.businessUserId,
      type: TransactionType.DEPOSIT,
      amount,
      currency: currency.toLowerCase(),
      status: TransactionStatus.PENDING,
      description: dto.description || 'Project payment via PayPal',
      paymentMethod: 'paypal',
      paymentProvider: 'paypal',
      referenceId: dto.projectId,
      balanceBefore: Number(businessWallet.balance),
      metadata: {
        payerUserId,
        businessUserId: dto.businessUserId,
        projectId: dto.projectId || null,
        milestoneId: dto.milestoneId || null,
        paymentKind: dto.paymentKind || ProjectPaymentKind.ONE_TIME,
      },
    });
    await this.transactionRepository.save(transaction);

    const order = await this.paypalService.createOrder(
      amount,
      currency,
      transaction.description || undefined,
    );

    transaction.paymentProviderTransactionId = order.orderId;
    await this.transactionRepository.save(transaction);

    return {
      transactionId,
      paypalOrderId: order.orderId,
      approvalUrl: order.approvalUrl,
      amount,
      currency,
      status: transaction.status,
    };
  }

  async completeStripeProjectPayment(payerUserId: string, paymentIntentId: string): Promise<Transaction> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }

    const transaction = await this.transactionRepository.findOne({
      where: {
        paymentProvider: 'stripe',
        paymentProviderTransactionId: paymentIntentId,
      },
      relations: ['wallet'],
    });
    if (!transaction) {
      throw new NotFoundException('Pending Stripe project payment not found');
    }
    if (transaction.status === TransactionStatus.COMPLETED) {
      return transaction;
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Only pending Stripe payments can be completed');
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException(
        `Stripe payment is not completed yet. Current status: ${paymentIntent.status}`,
      );
    }

    const metadataPayer = paymentIntent.metadata?.payer_user_id || transaction.metadata?.payerUserId;
    if (metadataPayer && metadataPayer !== payerUserId) {
      throw new ForbiddenException('You are not allowed to complete this payment');
    }
    if (!transaction.wallet) {
      throw new BadRequestException('Destination wallet is missing');
    }

    const balanceBefore = Number(transaction.wallet.balance);
    const availableBefore = this.resolveAvailableBalance(transaction.wallet);

    transaction.status = TransactionStatus.COMPLETED;
    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = balanceBefore + Number(transaction.amount);
    transaction.metadata = {
      ...(transaction.metadata || {}),
      stripePaymentIntentId: paymentIntent.id,
      completedAt: new Date().toISOString(),
    };

    transaction.wallet.balance = transaction.balanceAfter;
    transaction.wallet.availableBalance = availableBefore + Number(transaction.amount);
    transaction.wallet.pendingBalance = Number(transaction.wallet.pendingBalance || 0);

    await this.walletRepository.save(transaction.wallet);
    return this.transactionRepository.save(transaction);
  }

  async capturePayPalProjectPayment(payerUserId: string, paypalOrderId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: {
        paymentProvider: 'paypal',
        paymentProviderTransactionId: paypalOrderId,
      },
      relations: ['wallet'],
    });
    if (!transaction) {
      throw new NotFoundException('Pending PayPal project payment not found');
    }
    if (transaction.status === TransactionStatus.COMPLETED) {
      return transaction;
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Only pending PayPal payments can be captured');
    }

    const capture = await this.paypalService.captureOrder(paypalOrderId);
    if (Number(capture.amount) !== Number(transaction.amount)) {
      throw new BadRequestException('Captured amount does not match expected project payment amount');
    }

    const metadataPayer = transaction.metadata?.payerUserId;
    if (metadataPayer && metadataPayer !== payerUserId) {
      throw new ForbiddenException('You are not allowed to capture this order');
    }

    if (!transaction.wallet) {
      throw new BadRequestException('Destination wallet is missing');
    }

    const balanceBefore = Number(transaction.wallet.balance);
    const availableBefore = this.resolveAvailableBalance(transaction.wallet);

    transaction.status = TransactionStatus.COMPLETED;
    transaction.paymentProviderTransactionId = capture.transactionId;
    transaction.balanceBefore = balanceBefore;

    transaction.wallet.balance = balanceBefore + Number(transaction.amount);
    transaction.wallet.availableBalance = availableBefore + Number(transaction.amount);
    transaction.wallet.pendingBalance = Number(transaction.wallet.pendingBalance || 0);
    transaction.balanceAfter = Number(transaction.wallet.balance);
    transaction.metadata = {
      ...(transaction.metadata || {}),
      paypalOrderId,
      paypalCaptureId: capture.transactionId,
      capturedAt: new Date().toISOString(),
    };

    await this.walletRepository.save(transaction.wallet);
    return this.transactionRepository.save(transaction);
  }

  async requestWithdrawal(
    userId: string,
    accountType: string,
    dto: WithdrawalRequestDto,
  ): Promise<WithdrawalRequest> {
    const allowedRoles = ['business', 'user', 'affiliate', AccountType.BUSINESS, AccountType.USER, AccountType.AFFILIATE];
    if (accountType && !allowedRoles.includes(accountType.toLowerCase() as any)) {
      throw new ForbiddenException('Only registered accounts can request withdrawals');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const wallet = await queryRunner.manager.findOne(Wallet, { where: { userId } });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
      if (!wallet.isActive) {
        throw new BadRequestException('Wallet is not active');
      }

      const amount = Number(dto.amount);
      const available = this.resolveAvailableBalance(wallet);
      if (available < amount) {
        throw new BadRequestException(
          `Insufficient available balance. Available: ${available}, Requested: ${amount}`,
        );
      }

      wallet.availableBalance = available - amount;
      wallet.pendingBalance = Number(wallet.pendingBalance || 0) + amount;
      await queryRunner.manager.save(wallet);

      const request = queryRunner.manager.create(WithdrawalRequest, {
        requestId: this.generateTransactionId('WREQ'),
        businessUserId: userId,
        amount,
        currency: (dto.currency || wallet.currency || 'USD').toUpperCase(),
        stripeAccountId: dto.stripeAccountId || dto.payoutMethod || 'bank_transfer',
        status: WithdrawalRequestStatus.PENDING,
        metadata: {
          note: dto.note || null,
          payoutMethod: dto.payoutMethod || 'Default Payout Method',
        },
      });

      await queryRunner.manager.save(request);
      await queryRunner.commitTransaction();
      return request;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyWithdrawals(userId: string, accountType: string): Promise<WithdrawalRequest[]> {
    return this.withdrawalRequestRepository.find({
      where: { businessUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    return this.withdrawalRequestRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async payWithdrawalRequest(
    requestId: string,
    adminId: string,
    note?: string,
  ): Promise<WithdrawalRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const request = await queryRunner.manager.findOne(WithdrawalRequest, {
        where: { id: requestId },
      });
      if (!request) {
        throw new NotFoundException('Withdrawal request not found');
      }
      if (request.status !== WithdrawalRequestStatus.PENDING) {
        throw new BadRequestException('Only pending withdrawal requests can be paid');
      }

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: request.businessUserId },
      });
      if (!wallet) {
        throw new NotFoundException('Wallet not found for withdrawal request');
      }

      let transferId = `TR-${Date.now()}`;
      if (this.stripe && request.stripeAccountId?.startsWith('acct_')) {
        try {
          const transfer = await this.stripe.transfers.create({
            amount: Math.round(Number(request.amount) * 100),
            currency: request.currency.toLowerCase(),
            destination: request.stripeAccountId,
            metadata: {
              requestId: request.requestId,
              businessUserId: request.businessUserId,
            },
          });
          transferId = transfer.id;
        } catch (stripeErr: any) {
          console.warn('Stripe transfer fallback to manual record:', stripeErr?.message);
        }
      }

      wallet.pendingBalance = Math.max(0, Number(wallet.pendingBalance || 0) - Number(request.amount));
      wallet.balance = Number(wallet.balance) - Number(request.amount);
      await queryRunner.manager.save(wallet);

      const payoutTransaction = queryRunner.manager.create(Transaction, {
        transactionId: this.generateTransactionId('WPAID'),
        walletId: wallet.id,
        userId: request.businessUserId,
        type: TransactionType.WITHDRAWAL,
        amount: Number(request.amount),
        currency: request.currency.toLowerCase(),
        status: TransactionStatus.COMPLETED,
        description: `Withdrawal paid to ${request.stripeAccountId}`,
        paymentMethod: request.stripeAccountId?.startsWith('acct_') ? 'stripe_transfer' : 'bank_transfer',
        paymentProvider: request.stripeAccountId?.startsWith('acct_') ? 'stripe' : 'manual_bank',
        paymentProviderTransactionId: transferId,
        balanceBefore: Number(wallet.balance) + Number(request.amount),
        balanceAfter: Number(wallet.balance),
        metadata: note ? { note } : undefined,
      });
      await queryRunner.manager.save(payoutTransaction);

      request.status = WithdrawalRequestStatus.PAID;
      request.stripeTransferId = transferId;
      request.relatedTransactionId = payoutTransaction.transactionId;
      request.reviewedByAdminId = adminId;
      request.processedAt = new Date();
      request.metadata = {
        ...(request.metadata || {}),
        adminNote: note || null,
      };
      await queryRunner.manager.save(request);

      await queryRunner.commitTransaction();
      return request;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectWithdrawalRequest(
    requestId: string,
    adminId: string,
    reason?: string,
  ): Promise<WithdrawalRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const request = await queryRunner.manager.findOne(WithdrawalRequest, {
        where: { id: requestId },
      });
      if (!request) {
        throw new NotFoundException('Withdrawal request not found');
      }
      if (request.status !== WithdrawalRequestStatus.PENDING) {
        throw new BadRequestException('Only pending withdrawal requests can be rejected');
      }

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: request.businessUserId },
      });
      if (!wallet) {
        throw new NotFoundException('Wallet not found for withdrawal request');
      }

      const available = this.resolveAvailableBalance(wallet);
      wallet.availableBalance = available + Number(request.amount);
      wallet.pendingBalance = Math.max(0, Number(wallet.pendingBalance || 0) - Number(request.amount));
      await queryRunner.manager.save(wallet);

      request.status = WithdrawalRequestStatus.REJECTED;
      request.rejectionReason = reason || 'Rejected by admin';
      request.reviewedByAdminId = adminId;
      request.processedAt = new Date();
      await queryRunner.manager.save(request);

      await queryRunner.commitTransaction();
      return request;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async validateBusinessUser(businessUserId: string): Promise<void> {
    const businessUser = await this.userRepository.findOne({
      where: { userId: businessUserId },
      select: ['userId', 'accountType', 'status'],
    });
    if (!businessUser) {
      throw new NotFoundException('Business user not found');
    }
    if (businessUser.accountType !== AccountType.BUSINESS) {
      throw new BadRequestException('Payment destination must be a business user');
    }
  }

  private resolveAvailableBalance(wallet: Wallet): number {
    if (Number(wallet.availableBalance || 0) > 0) {
      return Number(wallet.availableBalance);
    }
    const derived = Number(wallet.balance) - Number(wallet.pendingBalance || 0);
    return derived > 0 ? derived : 0;
  }

  private generateTransactionId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(6).toString('hex').toUpperCase()}`;
  }
}

