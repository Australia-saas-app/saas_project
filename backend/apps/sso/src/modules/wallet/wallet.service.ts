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
  ) { }

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
    } catch { }

    // 2. If it's a valid UUID, query by id
    if (isUuid) {
      try {
        const user = await this.userRepository.findOne({
          where: { id: cleanId },
        });
        if (user) return user;
      } catch { }
    }

    return null;
  }

  async onModuleInit() {
    try {
      await this.userRepository.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS "paymentMethods" jsonb DEFAULT '[]'::jsonb;`
      );
    } catch { }

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
    } catch { }

    try {
      await this.userRepository.query(
        `ALTER TABLE payment_cards ALTER COLUMN "userId" TYPE varchar(100);`
      );
      await this.userRepository.query(
        `ALTER TABLE transactions ALTER COLUMN "userId" TYPE varchar(100);`
      );
      await this.userRepository.query(
        `ALTER TABLE wallets ALTER COLUMN "userId" TYPE varchar(100);`
      );
      await this.userRepository.query(
        `ALTER TABLE transactions ALTER COLUMN "userId" DROP NOT NULL;`
      );
      await this.userRepository.query(
        `ALTER TABLE wallets ALTER COLUMN "userId" DROP NOT NULL;`
      );
      await this.userRepository.query(`
        UPDATE transactions t
        SET "userId" = w."userId"
        FROM wallets w
        WHERE t."walletId" = w.id
          AND (t."userId" IS NULL OR t."userId" = '')
          AND w."userId" IS NOT NULL AND w."userId" != '';
      `);
    } catch { }
  }

  async getWallet(userId: string): Promise<Wallet> {
    if (!userId) {
      throw new NotFoundException('User ID is required');
    }
    const user = await this.findUserSafe(userId);
    const searchIds = Array.from(
      new Set([userId, user?.userId, user?.id, user?.email].filter(Boolean) as string[])
    );
    const canonicalUserId = user?.userId || user?.id || userId;

    // Search for all wallets linked to any of the user's IDs, prioritizing funded ones
    const existingWallets = await this.walletRepository.find({
      where: searchIds.map((id) => ({ userId: id })),
      order: { balance: 'DESC', createdAt: 'ASC' },
    });

    if (existingWallets.length > 0) {
      const primaryWallet = existingWallets[0];

      // If multiple wallets were created across rebuilds/relogins, merge them cleanly
      if (existingWallets.length > 1) {
        let extraBalance = 0;
        for (let i = 1; i < existingWallets.length; i++) {
          const extra = existingWallets[i];
          extraBalance += Number(extra.balance || 0);
          await this.transactionRepository.update(
            { walletId: extra.id },
            { walletId: primaryWallet.id, userId: canonicalUserId }
          ).catch(() => {});
          await this.walletRepository.delete({ id: extra.id }).catch(() => {});
        }
        if (extraBalance > 0) {
          primaryWallet.balance = Number((Number(primaryWallet.balance || 0) + extraBalance).toFixed(2));
        }
      }

      if (primaryWallet.userId !== canonicalUserId) {
        primaryWallet.userId = canonicalUserId;
      }
      await this.walletRepository.save(primaryWallet).catch(() => {});
      return primaryWallet;
    }

    let wallet = this.walletRepository.create({
      userId: canonicalUserId,
      balance: 0,
      currency: user?.currency || 'USD',
    });
    wallet = await this.walletRepository.save(wallet);
    return wallet;
  }

  async createWallet(userId: string): Promise<Wallet> {
    return this.getWallet(userId);
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return +wallet.balance;
  }

  async getWalletSummary(userId: string): Promise<{
    balance: number;
    totalWithdrawn: number;
    pendingPayout: number;
    totalEarned: number;
    currency: string;
  }> {
    const wallet = await this.getWallet(userId);
    const user = await this.findUserSafe(userId);
    const searchIds = [userId];
    if (user?.userId && !searchIds.includes(user.userId)) searchIds.push(user.userId);
    if (user?.id && !searchIds.includes(user.id)) searchIds.push(user.id);
    if (user?.email && !searchIds.includes(user.email)) searchIds.push(user.email);

    let totalWithdrawn = 0;
    let pendingPayout = 0;
    let totalEarned = 0;

    try {
      const summaryWhere: any[] = searchIds.map((id) => ({ userId: id }));
      if (wallet?.id) {
        summaryWhere.push({ walletId: wallet.id });
      }
      const txs = await this.transactionRepository.find({
        where: summaryWhere,
      });

      let netComputedBalance = 0;
      for (const t of txs) {
        const amt = Number(t.amount || 0);
        const typeStr = String(t.type || '').toLowerCase();
        const statusStr = String(t.status || '').toLowerCase();
        const desc = String(t.description || '').toLowerCase();
        const isReverted = desc.includes('revert') || statusStr === 'reverted';

        if (isReverted) continue;

        if (statusStr === 'completed' || statusStr === 'approved' || statusStr === 'complete' || statusStr === 'paid') {
          if (typeStr === 'deposit' || typeStr.includes('deposit') || typeStr.includes('earn')) {
            netComputedBalance += amt;
          } else if (typeStr === 'withdrawal' || typeStr.includes('withdraw')) {
            netComputedBalance -= amt;
          }
        }

        if (typeStr.includes('withdraw')) {
          if (
            statusStr === 'completed' ||
            statusStr === 'approved' ||
            statusStr === 'complete' ||
            statusStr === 'paid'
          ) {
            totalWithdrawn += amt;
          } else if (statusStr === 'pending' || statusStr === 'processing') {
            pendingPayout += amt;
          }
        } else if (
          typeStr === 'deposit' ||
          typeStr === 'payment' ||
          typeStr === 'transfer' ||
          typeStr.includes('earn') ||
          typeStr.includes('commission') ||
          typeStr.includes('milestone') ||
          typeStr.includes('project')
        ) {
          if (
            statusStr === 'completed' ||
            statusStr === 'approved' ||
            statusStr === 'complete' ||
            statusStr === 'paid'
          ) {
            totalEarned += amt;
          }
        }
      }

      // If wallet balance in DB is 0 but completed transactions exist, restore the computed balance
      if (Number(wallet.balance) === 0 && netComputedBalance > 0) {
        wallet.balance = Number(netComputedBalance.toFixed(2));
        await this.walletRepository.save(wallet).catch(() => {});
      }
    } catch {}

    return {
      balance: +wallet.balance,
      totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      pendingPayout: Number(pendingPayout.toFixed(2)),
      totalEarned: Number(totalEarned.toFixed(2)),
      currency: wallet.currency || 'USD',
    };
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

    const user = (await this.findUserSafe(userId)) || (wallet.userId ? await this.findUserSafe(wallet.userId) : null);
    const canonicalUserId = user?.userId || wallet.userId || user?.id || userId;
    const txId = this.generateMixedAlphaNumericTxId('DEP');

    const tx = this.transactionRepository.create({
      userId: canonicalUserId,
      walletId: wallet.id,
      transactionId: txId,
      type: TransactionType.DEPOSIT,
      amount,
      currency: wallet.currency || 'USD',
      status: TransactionStatus.COMPLETED,
      description: description || (savedCard ? `Deposit via ${savedCard.cardBrand} ****${savedCard.last4}` : 'Wallet Deposit'),
      paymentMethod: options?.method || (savedCard ? 'card' : 'online'),
      paymentCardId: savedCard ? savedCard.id : undefined,
      balanceBefore,
      balanceAfter,
      metadata: {
        userEmail: user?.email || '',
        userName: user?.fullName || (user as any)?.name || user?.username || 'User',
        role: user?.accountType || (user as any)?.role || 'USER',
        ...(savedCard
          ? {
            cardId: savedCard.id,
            cardBrand: savedCard.cardBrand,
            last4: savedCard.last4,
            cardHolder: savedCard.cardHolderName,
          }
          : {}),
      },
    });

    const savedTx = await this.transactionRepository.save(tx);

    // Guarantee userId is stored in DB column
    if (canonicalUserId && savedTx?.id) {
      try {
        await this.transactionRepository.query(
          `UPDATE transactions SET "userId" = $1 WHERE id = $2`,
          [canonicalUserId, savedTx.id]
        );
      } catch {}
    }

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
    if (numAmount < 20) {
      throw new BadRequestException('Minimum withdrawal amount is $20');
    }

    const wallet = await this.getWallet(userId);
    const balanceBefore = Number(wallet.balance || 0);

    if (balanceBefore < numAmount) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceAfter = Number((balanceBefore - numAmount).toFixed(2));
    wallet.balance = balanceAfter;
    await this.walletRepository.save(wallet);

    const user = (await this.findUserSafe(userId)) || (wallet.userId ? await this.findUserSafe(wallet.userId) : null);
    const canonicalUserId = user?.userId || wallet.userId || user?.id || userId;
    const txId = this.generateMixedAlphaNumericTxId('WD');

    const tx = this.transactionRepository.create({
      userId: canonicalUserId,
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
      metadata: {
        userEmail: user?.email || '',
        userName: user?.fullName || (user as any)?.name || user?.username || 'User',
        role: user?.accountType || (user as any)?.role || 'USER',
        payoutMethod: method || 'wallet',
      },
    });

    const savedTx = await this.transactionRepository.save(tx);

    const withdrawUserId = tx.userId || canonicalUserId;
    if (withdrawUserId && savedTx?.id) {
      try {
        await this.transactionRepository.query(
          `UPDATE transactions SET "userId" = $1 WHERE id = $2`,
          [withdrawUserId, savedTx.id]
        );
      } catch {}
    }

    return {
      success: true,
      message: 'Withdrawal request submitted successfully',
      wallet,
      balance: balanceAfter,
      transactionId: txId,
      transaction: savedTx,
    };
  }

  async getTransactions(userId: string, page: any = 1, limit?: any, all: boolean = false, type?: string): Promise<any> {
    try {
      let whereClause: any;
      if (all && !userId) {
        if (type && type.toLowerCase().includes('withdraw')) {
          whereClause = { type: TransactionType.WITHDRAWAL };
        } else if (type) {
          whereClause = { type: type.toLowerCase() as any };
        } else {
          whereClause = {};
        }
      } else {
        if (!userId) {
          return {
            data: [],
            pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
          };
        }
        const user = await this.findUserSafe(userId);
        const searchIds = Array.from(
          new Set([userId, user?.userId, user?.id, user?.email].filter(Boolean) as string[])
        );

        let walletId: string | null = null;
        try {
          const userWallet = await this.getWallet(userId);
          walletId = userWallet?.id || null;
        } catch {}

        const baseTargets: any[] = searchIds.map((id) => ({ userId: id }));
        if (walletId) {
          baseTargets.push({ walletId });
        }

        if (type && type.toLowerCase().includes('withdraw')) {
          whereClause = [
            ...baseTargets.map((cond) => ({ ...cond, type: 'withdrawal' as any })),
            ...baseTargets.map((cond) => ({ ...cond, type: 'WITHDRAWAL' as any })),
          ];
        } else if (type && type.toLowerCase().includes('deposit')) {
          whereClause = [
            ...baseTargets.map((cond) => ({ ...cond, type: 'deposit' as any })),
            ...baseTargets.map((cond) => ({ ...cond, type: 'DEPOSIT' as any })),
          ];
        } else {
          whereClause = baseTargets.map((cond) => (type ? { ...cond, type: type.toLowerCase() as any } : cond));
        }
      }

      const findOptions: any = {
        where: whereClause,
        order: { createdAt: 'DESC' },
      };

      if (!all && limit && limit !== 'all') {
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.max(1, parseInt(String(limit), 10) || 20);
        findOptions.skip = (pageNum - 1) * limitNum;
        findOptions.take = limitNum;
      }

      const [transactions, total] = await this.transactionRepository.findAndCount(findOptions);

      // Dynamically auto-heal any orphan transactions belonging to this wallet
      try {
        const user = await this.findUserSafe(userId);
        const userWallet = await this.getWallet(userId);
        if (user?.userId && userWallet?.id) {
          this.transactionRepository.query(
            `UPDATE transactions SET "userId" = $1 WHERE "walletId" = $2 AND ("userId" IS NULL OR "userId" = '')`,
            [user.userId, userWallet.id]
          ).catch(() => {});
        }
      } catch {}

      return {
        data: transactions || [],
        pagination: {
          page: parseInt(String(page), 10) || 1,
          limit: limit ? parseInt(String(limit), 10) : total,
          total: total || 0,
          totalPages: limit ? Math.ceil((total || 0) / parseInt(String(limit), 10)) : 1,
        },
      };
    } catch {
      return {
        data: [],
        pagination: {
          page: 1,
          limit: 0,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  async getAllWithdrawalRequests(): Promise<any> {
    try {
      let transactions: Transaction[] = [];
      try {
        transactions = await this.transactionRepository
          .createQueryBuilder('t')
          .where("t.type::text ILIKE :w", { w: '%withdraw%' })
          .orderBy('t.createdAt', 'DESC')
          .getMany();
      } catch {
        transactions = await this.transactionRepository.find({
          where: { type: TransactionType.WITHDRAWAL },
          order: { createdAt: 'DESC' },
        });
      }

      // Gather all user IDs, emails, and wallet IDs from all transactions
      const txUserIds = transactions
        .map((t) => t.userId)
        .filter((id): id is string => Boolean(id) && id !== 'user');
      const txMetaEmails = transactions
        .map((t) => t.metadata?.userEmail)
        .filter((em): em is string => Boolean(em) && typeof em === 'string' && em.includes('@'));
      const txMetaUserIds = transactions
        .map((t) => t.metadata?.userId)
        .filter((id): id is string => Boolean(id) && typeof id === 'string' && id !== 'user');

      const allWalletIds = Array.from(new Set(transactions.map((t) => t.walletId).filter((wid): wid is string => Boolean(wid))));

      const userMap = new Map<string, any>();

      // Fetch all wallets referenced by transactions
      let wallets: Wallet[] = [];
      if (allWalletIds.length > 0) {
        try {
          wallets = await this.walletRepository.find({
            where: allWalletIds.map((wid) => ({ id: wid })),
          });
        } catch { }
      }

      const walletOwnerIds = wallets.map((w) => w.userId).filter((uid): uid is string => Boolean(uid) && uid !== 'user');
      const combinedUserIds = Array.from(new Set([...txUserIds, ...txMetaUserIds, ...txMetaEmails, ...walletOwnerIds]));

      if (combinedUserIds.length > 0) {
        try {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const validUuids = combinedUserIds.filter((uId) => uuidRegex.test(uId));
          const users = await this.userRepository.find({
            where: [
              ...combinedUserIds.map((uId) => ({ userId: uId })),
              ...combinedUserIds.map((uId) => ({ email: uId })),
              ...(validUuids.length > 0 ? validUuids.map((uId) => ({ id: uId })) : []),
            ],
          });
          users.forEach((u) => {
            if (u.userId) userMap.set(u.userId, u);
            if (u.id) userMap.set(u.id, u);
            if (u.email) userMap.set(u.email, u);
          });

          // Link wallets to their resolved user objects
          wallets.forEach((w) => {
            if (w.userId) {
              const u = userMap.get(w.userId);
              if (u) {
                userMap.set(`wallet_${w.id}`, u);
              }
            }
          });
        } catch { }
      }

      const mapped = transactions.map((t) => {
        const user = (t.userId ? userMap.get(t.userId) : null)
          || (t.metadata?.userEmail ? userMap.get(t.metadata.userEmail) : null)
          || (t.metadata?.userId ? userMap.get(t.metadata.userId) : null)
          || (t.walletId ? userMap.get(`wallet_${t.walletId}`) : null);

        const resolvedUserId = user?.userId || user?.id || t.metadata?.userId || (t.userId && t.userId !== 'user' ? t.userId : '') || '';
        const userEmail = user?.email || t.metadata?.userEmail || (t.userId && t.userId.includes('@') ? t.userId : '') || '';
        const userName = user?.fullName || (user as any)?.name || t.metadata?.userName || user?.username || '';
        const role = user?.accountType || (user as any)?.role || t.metadata?.role || (resolvedUserId.toUpperCase().startsWith('BUS') ? 'BUSINESS' : resolvedUserId.toUpperCase().startsWith('AFF') ? 'AFFILIATE' : 'USER');

        // Auto-heal missing or dummy userId on transaction asynchronously
        if (user && (!t.userId || t.userId === 'user')) {
          this.transactionRepository.update(t.id, { userId: user.userId || user.id }).catch(() => {});
        }

        return {
          id: t.id,
          transactionId: t.transactionId,
          requestId: t.transactionId || t.id,
          userId: resolvedUserId,
          businessUserId: resolvedUserId,
          userName,
          userEmail,
          role,
          metadata: {
            ...t.metadata,
            userEmail,
            userName,
            role,
            userId: resolvedUserId,
          },
          type: t.type || 'WITHDRAWAL',
          amount: Number(t.amount || 0),
          currency: t.currency || 'USD',
          status: t.status,
          method: t.paymentMethod || 'Wallet Withdrawal',
          payoutMethod: t.paymentMethod || 'Wallet Withdrawal',
          description: t.description,
          failureReason: t.failureReason || t.metadata?.rejectionReason,
          rejectionReason: t.failureReason || t.metadata?.rejectionReason || (t.description?.includes('Rejected:') ? t.description.split('Rejected:')[1]?.trim() : undefined),
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      });

      return { success: true, data: mapped };
    } catch (err: any) {
      return { success: false, data: [], error: err.message };
    }
  }

  async updateWithdrawalStatus(
    txIdOrId: string,
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<any> {
    const cleanId = String(txIdOrId).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    const tx = await this.transactionRepository.findOne({
      where: isUuid ? [{ transactionId: cleanId }, { id: cleanId }] : [{ transactionId: cleanId }],
    });

    if (!tx) {
      throw new NotFoundException('Withdrawal transaction not found');
    }

    if (action === 'approve') {
      tx.status = TransactionStatus.COMPLETED;
      await this.transactionRepository.save(tx);
      return { success: true, message: 'Withdrawal approved', transaction: tx };
    } else {
      tx.status = TransactionStatus.FAILED;
      if (reason) {
        tx.failureReason = reason;
        tx.description = `${tx.description || 'Withdrawal'} - Rejected: ${reason}`;
        tx.metadata = { ...(tx.metadata || {}), rejectionReason: reason };
      }
      await this.transactionRepository.save(tx);

      try {
        let wallet: Wallet | null = null;
        if (tx.walletId) {
          wallet = await this.walletRepository.findOne({ where: { id: tx.walletId } });
        }
        if (!wallet && tx.userId) {
          wallet = await this.walletRepository.findOne({ where: { userId: tx.userId } });
        }
        if (wallet) {
          const numAmount = Number(tx.amount || 0);
          wallet.balance = Number((Number(wallet.balance || 0) + numAmount).toFixed(2));
          await this.walletRepository.save(wallet);
        }
      } catch { }

      return { success: true, message: 'Withdrawal rejected and balance restored', transaction: tx };
    }
  }

  async revertWithdrawal(
    userId: string,
    txIdOrId: string,
  ): Promise<any> {
    const cleanId = String(txIdOrId).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    const tx = await this.transactionRepository.findOne({
      where: isUuid ? [{ transactionId: cleanId }, { id: cleanId }] : [{ transactionId: cleanId }],
    });

    if (!tx) {
      throw new NotFoundException('Withdrawal transaction not found');
    }

    if (tx.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Withdrawal has already been processed and cannot be reverted');
    }

    const now = Date.now();
    const txTime = new Date(tx.createdAt).getTime();
    const diffHours = (now - txTime) / (1000 * 60 * 60);
    if (diffHours > 24) {
      throw new BadRequestException('24-hour window has expired. Withdrawal cannot be reverted');
    }

    const numAmount = Number(tx.amount || 0);

    // Restore balance to user wallet
    try {
      let wallet: Wallet | null = null;
      if (tx.walletId) {
        wallet = await this.walletRepository.findOne({ where: { id: tx.walletId } });
      }
      if (!wallet && (tx.userId || userId)) {
        wallet = await this.walletRepository.findOne({ where: { userId: tx.userId || userId } });
      }
      if (wallet) {
        wallet.balance = Number((Number(wallet.balance || 0) + numAmount).toFixed(2));
        await this.walletRepository.save(wallet);
      }
    } catch { }

    // Remove the pending transaction completely so it no longer appears in tables
    try {
      await this.transactionRepository.delete({ id: tx.id });
    } catch {
      tx.status = TransactionStatus.FAILED;
      tx.description = `${tx.description || 'Withdrawal'} - Reverted by user`;
      await this.transactionRepository.save(tx);
    }

    console.log(`[WalletService] Withdrawal ${cleanId} reverted by ${userId || 'user'}, $${numAmount} restored to wallet balance.`);

    return { success: true, message: 'Withdrawal reverted and balance restored', amount: numAmount };
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
      if (Array.isArray(user.paymentMethods) && user.paymentMethods.length > 0) {
        list = [...user.paymentMethods];
      } else {
        try {
          const raw = await this.userRepository.query(
            `SELECT "paymentMethods", paymentmethods FROM users WHERE id = $1 OR "userId" = $2 LIMIT 1`,
            [user.id, user.userId || user.id]
          );
          const rawRow = raw?.[0];
          const rawMethods = rawRow?.paymentMethods || rawRow?.paymentmethods;
          if (Array.isArray(rawMethods) && rawMethods.length > 0) {
            list = [...rawMethods];
          } else if (typeof rawMethods === 'string') {
            try {
              const parsed = JSON.parse(rawMethods);
              if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
            } catch { }
          }
        } catch { }
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
      } catch { }

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
          } catch { }
        }
      } catch { }
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
    } catch { }

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
      } catch { }
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
    } catch { }
    try {
      await this.userRepository.query(
        `UPDATE users SET "paymentMethods" = $1 WHERE id = $2 OR "userId" = $3`,
        [JSON.stringify(filtered), user.id, user.userId || user.id]
      );
    } catch { }

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
    } catch { }
    try {
      await this.userRepository.query(
        `UPDATE users SET "paymentMethods" = $1 WHERE id = $2 OR "userId" = $3`,
        [JSON.stringify(list), user.id, user.userId || user.id]
      );
    } catch { }

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