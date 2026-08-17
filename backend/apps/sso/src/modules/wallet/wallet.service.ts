import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { PaymentCard, CardType, CardStatus } from '../../entities/payment-card.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PaymentCard)
    private readonly paymentCardRepository: Repository<PaymentCard>,
  ) {}

  async getWallet(userId: string): Promise<Wallet> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    const user = await this.userRepository
      .findOne({ where: [{ userId }, { id: userId }] })
      .catch(() => null);

    const actualUserId = user?.userId || user?.id || userId;
    let wallet = await this.walletRepository.findOne({
      where: [{ userId: actualUserId }, { userId }],
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        userId: actualUserId,
        balance: 0,
        currency: user?.currency || 'USD',
      });
      wallet = await this.walletRepository.save(wallet);
    }
    return wallet;
  }

  async createWallet(userId: string): Promise<Wallet> {
    const existing = await this.walletRepository.findOne({ where: { userId } });
    if (existing) {
      return existing;
    }

    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = this.walletRepository.create({
      userId,
      currency: user.currency,
    });

    return await this.walletRepository.save(wallet);
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return +wallet.balance;
  }

  async addCard(
    userId: string,
    data: {
      cardHolderName: string;
      cardNumber: string;
      expiryMonth: string;
      expiryYear: string;
      cardBrand?: string;
      isDefault?: boolean;
      billingAddress?: string;
      billingCity?: string;
      billingCountry?: string;
    },
  ): Promise<PaymentCard> {
    const cleanNum = (data.cardNumber || '').replace(/\s+/g, '');
    const last4 = cleanNum.slice(-4) || '4242';

    let cardType = CardType.VISA;
    const brandLower = (data.cardBrand || '').toLowerCase();
    if (brandLower.includes('master') || cleanNum.startsWith('5')) cardType = CardType.MASTERCARD;
    else if (brandLower.includes('amex') || cleanNum.startsWith('3')) cardType = CardType.AMEX;
    else if (brandLower.includes('discover') || cleanNum.startsWith('6')) cardType = CardType.DISCOVER;

    if (data.isDefault) {
      await this.paymentCardRepository.update({ userId }, { isDefault: false });
    }

    // Check if same last4 and expiry exists for user
    let card = await this.paymentCardRepository.findOne({
      where: {
        userId,
        last4,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
      },
    });

    if (card) {
      card.cardHolderName = data.cardHolderName || card.cardHolderName;
      card.status = CardStatus.ACTIVE;
      if (data.isDefault !== undefined) card.isDefault = data.isDefault;
      return await this.paymentCardRepository.save(card);
    }

    card = this.paymentCardRepository.create({
      userId,
      cardHolderName: data.cardHolderName || 'Cardholder',
      last4,
      cardBrand: data.cardBrand || (cardType.toUpperCase()),
      cardType,
      expiryMonth: String(data.expiryMonth || '12'),
      expiryYear: String(data.expiryYear || '2030'),
      encryptedCardToken: `tok_${Date.now()}_${last4}`,
      status: CardStatus.ACTIVE,
      isDefault: data.isDefault ?? true,
      billingAddress: data.billingAddress,
      billingCity: data.billingCity,
      billingCountry: data.billingCountry,
    });

    return await this.paymentCardRepository.save(card);
  }

  async getCards(userId: string): Promise<PaymentCard[]> {
    if (!userId) return [];
    try {
      const user = await this.userRepository
        .findOne({ where: [{ userId }, { id: userId }] })
        .catch(() => null);

      const searchIds = [userId];
      if (user?.userId && !searchIds.includes(user.userId)) searchIds.push(user.userId);
      if (user?.id && !searchIds.includes(user.id)) searchIds.push(user.id);

      return await this.paymentCardRepository.find({
        where: searchIds.map((id) => ({ userId: id })),
        order: { isDefault: 'DESC', createdAt: 'DESC' },
      });
    } catch {
      return [];
    }
  }

  async deposit(
    userId: string,
    amount: number,
    description?: string,
    options?: {
      cardData?: {
        cardHolderName: string;
        cardNumber: string;
        expiryMonth: string;
        expiryYear: string;
        cardBrand?: string;
      };
      paymentCardId?: number;
      method?: string;
    },
  ): Promise<Wallet> {
    const wallet = await this.getWallet(userId);
    const balanceBefore = Number(wallet.balance || 0);
    const balanceAfter = Number((balanceBefore + Number(amount)).toFixed(2));

    let savedCard: PaymentCard | null = null;
    if (options?.cardData && options.cardData.cardNumber) {
      savedCard = await this.addCard(userId, options.cardData);
    } else if (options?.paymentCardId) {
      savedCard = await this.paymentCardRepository.findOne({
        where: { id: options.paymentCardId, userId },
      });
    }

    wallet.balance = balanceAfter;
    await this.walletRepository.save(wallet);

    const tx = this.transactionRepository.create({
      userId: wallet.userId || userId,
      walletId: wallet.id,
      type: TransactionType.DEPOSIT,
      amount,
      currency: wallet.currency || 'USD',
      status: TransactionStatus.COMPLETED,
      description: description || (savedCard ? `Deposit via ${savedCard.cardBrand} ****${savedCard.last4}` : 'Wallet Deposit'),
      paymentMethod: options?.method || (savedCard ? 'card' : 'online'),
      paymentCardId: savedCard ? savedCard.id : undefined,
      balanceBefore,
      balanceAfter,
      metadata: savedCard
        ? {
            cardId: savedCard.id,
            cardBrand: savedCard.cardBrand,
            last4: savedCard.last4,
            cardHolder: savedCard.cardHolderName,
          }
        : undefined,
    });

    await this.transactionRepository.save(tx);

    return wallet;
  }

  async withdraw(userId: string, amount: number, description?: string): Promise<Wallet> {
    const wallet = await this.getWallet(userId);
    const balanceBefore = Number(wallet.balance || 0);

    if (balanceBefore < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceAfter = Number((balanceBefore - Number(amount)).toFixed(2));
    wallet.balance = balanceAfter;
    await this.walletRepository.save(wallet);

    const tx = this.transactionRepository.create({
      userId: wallet.userId || userId,
      walletId: wallet.id,
      type: TransactionType.WITHDRAWAL,
      amount,
      currency: wallet.currency || 'USD',
      status: TransactionStatus.COMPLETED,
      description: description || 'Wallet Withdrawal',
      paymentMethod: 'wallet',
      balanceBefore,
      balanceAfter,
    });

    await this.transactionRepository.save(tx);

    return wallet;
  }

  async getTransactions(userId: string, page: any = 1, limit: any = 20): Promise<any> {
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    if (!userId) {
      return {
        data: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
      };
    }

    try {
      const user = await this.userRepository
        .findOne({ where: [{ userId }, { id: userId }] })
        .catch(() => null);

      const searchIds = [userId];
      if (user?.userId && !searchIds.includes(user.userId)) searchIds.push(user.userId);
      if (user?.id && !searchIds.includes(user.id)) searchIds.push(user.id);

      const [transactions, total] = await this.transactionRepository.findAndCount({
        where: searchIds.map((id) => ({ userId: id })),
        order: { createdAt: 'DESC' },
        skip,
        take: limitNum,
      });

      return {
        data: transactions || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total || 0,
          totalPages: Math.ceil((total || 0) / limitNum),
        },
      };
    } catch {
      return {
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  private async createTransaction(
    userId: string,
    walletId: string,
    type: TransactionType,
    amount: number,
    currency: string,
    description?: string,
  ): Promise<Transaction> {
    const transaction = this.transactionRepository.create({
      userId,
      walletId,
      type,
      amount,
      currency,
      status: TransactionStatus.COMPLETED,
      description,
    });

    return await this.transactionRepository.save(transaction);
  }
}