import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { PaymentCard, CardType, CardStatus } from '../../entities/payment-card.entity';

@Injectable()
export class WalletService implements OnModuleInit {
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

  private async findUserSafe(identifier: string): Promise<User | null> {
    if (!identifier) return null;
    const cleanId = String(identifier).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    // 1. Query by userId (ULID) or email
    try {
      const user = await this.userRepository.findOne({
        where: [{ userId: cleanId }, { email: cleanId }],
      });
      if (user) return user;
    } catch {}

    // 2. If it's a valid UUID, query by id
    if (isUuid) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: cleanId },
        });
        if (user) return user;
      } catch {}
    }

    return null;
  }

  async onModuleInit() {
    try {
      await this.userRepository.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS "paymentMethods" jsonb DEFAULT '[]'::jsonb;`
      );
    } catch {}

    try {
      await this.userRepository.query(`
        CREATE TABLE IF NOT EXISTS payment_cards (
          id SERIAL PRIMARY KEY,
          "userId" varchar(100) NOT NULL,
          "cardHolderName" varchar(100) NOT NULL,
          last4 varchar(4) NOT NULL,
          "cardBrand" varchar(50) NOT NULL,
          "cardType" varchar(50) NOT NULL,
          "expiryMonth" varchar(5) NOT NULL,
          "expiryYear" varchar(4) NOT NULL,
          "encryptedCardToken" text,
          status varchar(50) DEFAULT 'active',
          "isDefault" boolean DEFAULT false,
          "billingAddress" varchar(255),
          "billingCity" varchar(100),
          "billingState" varchar(100),
          "billingZipCode" varchar(20),
          "billingCountry" varchar(100),
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );
      `);
    } catch {}

    try {
      await this.userRepository.query(
        `ALTER TABLE payment_cards ALTER COLUMN "userId" TYPE varchar(100);`
      );
    } catch {}
  }

  async getWallet(userId: string): Promise<Wallet> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    const user = await this.findUserSafe(userId);

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
    const user = await this.findUserSafe(userId);
    const actualUserId = user?.userId || user?.id || userId;

    const existing = await this.walletRepository.findOne({
      where: [{ userId: actualUserId }, { userId }],
    });
    if (existing) {
      return existing;
    }

    const wallet = this.walletRepository.create({
      userId: actualUserId,
      currency: user?.currency || 'USD',
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
    const user = await this.findUserSafe(userId);
    const targetUserId = user?.userId || user?.id || userId;

    const cleanNum = (data.cardNumber || '').replace(/\s+/g, '');
    const last4 = cleanNum.slice(-4) || '4242';

    let cardType = CardType.VISA;
    const brandLower = (data.cardBrand || '').toLowerCase();
    if (brandLower.includes('master') || cleanNum.startsWith('5')) cardType = CardType.MASTERCARD;
    else if (brandLower.includes('amex') || cleanNum.startsWith('3')) cardType = CardType.AMEX;
    else if (brandLower.includes('discover') || cleanNum.startsWith('6')) cardType = CardType.DISCOVER;

    const searchIds = [targetUserId];
    if (user?.userId && !searchIds.includes(user.userId)) searchIds.push(user.userId);
    if (user?.id && !searchIds.includes(user.id)) searchIds.push(user.id);
    if (userId && !searchIds.includes(userId)) searchIds.push(userId);

    if (data.isDefault) {
      for (const sid of searchIds) {
        await this.paymentCardRepository.update({ userId: sid }, { isDefault: false }).catch(() => null);
      }
    }

    // Check if same last4 and expiry exists for user
    let card: PaymentCard | null = null;
    for (const sid of searchIds) {
      card = await this.paymentCardRepository
        .findOne({
          where: {
            userId: sid,
            last4,
            expiryMonth: String(data.expiryMonth),
            expiryYear: String(data.expiryYear),
          },
        })
        .catch(() => null);
      if (card) break;
    }

    if (card) {
      card.cardHolderName = data.cardHolderName || card.cardHolderName;
      card.status = CardStatus.ACTIVE;
      if (data.isDefault !== undefined) card.isDefault = data.isDefault;
      return await this.paymentCardRepository.save(card);
    }

    card = this.paymentCardRepository.create({
      userId: targetUserId,
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
      const user = await this.findUserSafe(userId);
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

  private generateMixedAlphaNumericTxId(prefix = 'WD'): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 12; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${randomPart}`;
  }

  async withdraw(userId: string, amount: number, description?: string, method?: string): Promise<any> {
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      throw new BadRequestException('Invalid withdrawal amount');
    }
    if (numAmount < 100) {
      throw new BadRequestException('Minimum withdrawal amount is $100');
    }

    const wallet = await this.getWallet(userId);
    const balanceBefore = Number(wallet.balance || 0);

    if (balanceBefore < numAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceAfter = Number((balanceBefore - numAmount).toFixed(2));
    wallet.balance = balanceAfter;
    await this.walletRepository.save(wallet);

    const txId = this.generateMixedAlphaNumericTxId('WD');

    const tx = this.transactionRepository.create({
      userId: wallet.userId || userId,
      walletId: wallet.id,
      transactionId: txId,
      type: TransactionType.WITHDRAWAL,
      amount: numAmount,
      currency: wallet.currency || 'USD',
      status: TransactionStatus.PENDING,
      description: description || 'Wallet Withdrawal',
      paymentMethod: method || 'wallet',
      balanceBefore,
      balanceAfter,
    });

    const savedTx = await this.transactionRepository.save(tx);

    return {
      success: true,
      message: 'Withdrawal request submitted successfully',
      wallet,
      balance: balanceAfter,
      transactionId: txId,
      transaction: savedTx,
    };
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
      const user = await this.findUserSafe(userId);
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

  async getPaymentMethods(userId: string): Promise<any[]> {
    if (!userId) return [];
    try {
      const user = await this.findUserSafe(userId);
      if (!user) return [];

      let list: any[] = [];
      if (Array.isArray(user.paymentMethods)) {
        list = [...user.paymentMethods];
      } else {
        try {
          const raw = await this.userRepository.query(
            `SELECT "paymentMethods", paymentmethods FROM users WHERE id = $1 OR "userId" = $2 LIMIT 1`,
            [user.id, user.userId || user.id]
          );
          const rawRow = raw?.[0];
          const rawMethods = rawRow?.paymentMethods || rawRow?.paymentmethods;
          if (Array.isArray(rawMethods)) {
            list = [...rawMethods];
          } else if (typeof rawMethods === 'string') {
            try {
              list = JSON.parse(rawMethods);
            } catch {}
          }
        } catch {}
      }

      // If user has saved payment cards in payment_cards table that are not yet in list, include them
      try {
        const cards = await this.getCards(userId);
        for (const card of cards) {
          const cardId = `CARD-${card.id}`;
          const alreadyExists = list.some(
            (m) =>
              m.id === cardId ||
              (m.type === 'Credit / Debit Card' &&
                (m.details?.cardNumber?.endsWith(card.last4) || m.summary?.includes(card.last4)))
          );
          if (!alreadyExists) {
            list.push({
              id: cardId,
              type: 'Credit / Debit Card',
              label: `${card.cardBrand || 'Card'} ending in ${card.last4}`,
              summary: `•••• ${card.last4} · Exp ${card.expiryMonth}/${card.expiryYear}`,
              details: {
                cardHolderName: card.cardHolderName,
                cardNumber: `•••• •••• •••• ${card.last4}`,
                expiryMonth: card.expiryMonth,
                expiryYear: card.expiryYear,
                cardBrand: card.cardBrand,
              },
              isDefault: Boolean(card.isDefault),
              createdAt: card.createdAt ? new Date(card.createdAt).toISOString() : new Date().toISOString(),
            });
          }
        }
      } catch {}

      return list;
    } catch {
      return [];
    }
  }

  async savePaymentMethod(userId: string, data: any): Promise<any> {
    if (!userId) throw new NotFoundException('User not found');
    const user = await this.findUserSafe(userId);
    if (!user) throw new NotFoundException('User not found');

    let list: any[] = [];
    if (Array.isArray(user.paymentMethods)) {
      list = [...user.paymentMethods];
    } else {
      try {
        const raw = await this.userRepository.query(
          `SELECT "paymentMethods", paymentmethods FROM users WHERE id = $1 OR "userId" = $2 LIMIT 1`,
          [user.id, user.userId || user.id]
        );
        const rawRow = raw?.[0];
        const rawVal = rawRow?.paymentMethods || rawRow?.paymentmethods;
        if (Array.isArray(rawVal)) {
          list = [...rawVal];
        } else if (typeof rawVal === 'string') {
          try {
            list = JSON.parse(rawVal);
          } catch {}
        }
      } catch {}
    }

    const isDefault = Boolean(data.isDefault);
    if (isDefault) {
      list = list.map((m) => ({ ...m, isDefault: false }));
    }

    const id = data.id || `PM-${Date.now().toString(36).toUpperCase()}`;
    const newRecord = {
      id,
      type: data.type,
      label: data.label,
      summary: data.summary,
      details: data.details || {},
      isDefault: isDefault || list.length === 0,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    const existingIndex = list.findIndex((m) => m.id === id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newRecord };
    } else {
      list.unshift(newRecord);
    }

    // Persist list to database via resilient methods
    try {
      await this.userRepository.update({ id: user.id }, { paymentMethods: list });
    } catch {}

    try {
      await this.userRepository.query(
        `UPDATE users SET "paymentMethods" = $1 WHERE id = $2 OR "userId" = $3`,
        [JSON.stringify(list), user.id, user.userId || user.id]
      );
    } catch {
      try {
        await this.userRepository.query(
          `UPDATE users SET paymentmethods = $1 WHERE id = $2 OR "userId" = $3`,
          [JSON.stringify(list), user.id, user.userId || user.id]
        );
      } catch {}
    }

    // If Credit / Debit card, also sync into payment_cards
    if (data.type === 'Credit / Debit Card' && (data.details?.cardNumber || data.details?.last4)) {
      try {
        const cardNum = data.details.cardNumber || '';
        const rawLast4 = cardNum.replace(/\s+/g, '').slice(-4) || data.details.last4 || '4242';
        await this.addCard(user.userId || user.id || userId, {
          cardHolderName: data.details.cardHolderName || data.details.cardholderName || user.fullName || 'Cardholder',
          cardNumber: cardNum || `424242424242${rawLast4}`,
          expiryMonth: data.details.expiryMonth || '12',
          expiryYear: data.details.expiryYear || '2030',
          cardBrand: data.details.cardBrand || 'Visa',
          isDefault,
        });
      } catch (err) {
        console.warn('Sync to payment_cards table warning:', err);
      }
    }

    return newRecord;
  }

  async deletePaymentMethod(userId: string, methodId: string): Promise<boolean> {
    if (!userId || !methodId) return false;
    const user = await this.findUserSafe(userId);
    if (!user) return false;

    let list = await this.getPaymentMethods(userId);
    const filtered = list.filter((m) => m.id !== methodId);
    if (filtered.length > 0 && !filtered.some((m) => m.isDefault)) {
      filtered[0].isDefault = true;
    }

    try {
      await this.userRepository.update({ id: user.id }, { paymentMethods: filtered });
    } catch {}
    try {
      await this.userRepository.query(
        `UPDATE users SET "paymentMethods" = $1 WHERE id = $2 OR "userId" = $3`,
        [JSON.stringify(filtered), user.id, user.userId || user.id]
      );
    } catch {}

    // If methodId starts with CARD-, delete from payment_cards table too
    if (methodId.startsWith('CARD-')) {
      const cardId = parseInt(methodId.replace('CARD-', ''), 10);
      if (!isNaN(cardId)) {
        await this.paymentCardRepository.delete({ id: cardId }).catch(() => null);
      }
    }

    return true;
  }

  async setDefaultPaymentMethod(userId: string, methodId: string): Promise<any> {
    if (!userId || !methodId) return null;
    const user = await this.findUserSafe(userId);
    if (!user) return null;

    let list = await this.getPaymentMethods(userId);
    list = list.map((m) => ({
      ...m,
      isDefault: m.id === methodId,
    }));

    try {
      await this.userRepository.update({ id: user.id }, { paymentMethods: list });
    } catch {}
    try {
      await this.userRepository.query(
        `UPDATE users SET "paymentMethods" = $1 WHERE id = $2 OR "userId" = $3`,
        [JSON.stringify(list), user.id, user.userId || user.id]
      );
    } catch {}

    // Also update payment_cards default flag if it's a card
    if (methodId.startsWith('CARD-')) {
      const cardId = parseInt(methodId.replace('CARD-', ''), 10);
      if (!isNaN(cardId)) {
        const searchIds = [user.id, user.userId, userId].filter(Boolean) as string[];
        for (const sid of searchIds) {
          await this.paymentCardRepository.update({ userId: sid }, { isDefault: false }).catch(() => null);
        }
        await this.paymentCardRepository.update({ id: cardId }, { isDefault: true }).catch(() => null);
      }
    }

    return list.find((m) => m.id === methodId) || null;
  }
}