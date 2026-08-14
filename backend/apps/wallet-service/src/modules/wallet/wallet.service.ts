import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({ where: { userId } });
    if (!wallet) {
      // Auto-create wallet on first access
      wallet = this.walletRepository.create({
        userId,
        currency: 'USD',
        balance: 0,
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
    const currency = user?.currency || 'USD';

    const wallet = this.walletRepository.create({
      userId,
      currency,
      balance: 0,
    });

    return await this.walletRepository.save(wallet);
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return wallet.balance;
  }

  async deposit(userId: string, amount: number, description?: string): Promise<Wallet> {
    const wallet = await this.getWallet(userId);

    wallet.balance = Number((Number(wallet.balance) + Number(amount)).toFixed(2));
    await this.walletRepository.save(wallet);

    await this.createTransaction(userId, wallet.id, TransactionType.DEPOSIT, Number(amount), wallet.currency, description);

    return wallet;
  }

  async withdraw(userId: string, amount: number, description?: string): Promise<Wallet> {
    const wallet = await this.getWallet(userId);

    if (Number(wallet.balance) < Number(amount)) {
      throw new BadRequestException('Insufficient balance in wallet');
    }

    wallet.balance = Number((Number(wallet.balance) - Number(amount)).toFixed(2));
    await this.walletRepository.save(wallet);

    await this.createTransaction(userId, wallet.id, TransactionType.WITHDRAWAL, Number(amount), wallet.currency, description);

    return wallet;
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async refund(userId: string, amount: number, description?: string): Promise<Wallet> {
    const wallet = await this.getWallet(userId);
    wallet.balance = Number((Number(wallet.balance) + Number(amount)).toFixed(2));
    await this.walletRepository.save(wallet);

    await this.createTransaction(userId, wallet.id, TransactionType.REFUND, Number(amount), wallet.currency, description);

    return wallet;
  }

  async adjustBalance(userId: string, adjustment: number, description?: string): Promise<Wallet> {
    const wallet = await this.getWallet(userId);
    wallet.balance = Number((Number(wallet.balance) + Number(adjustment)).toFixed(2));
    await this.walletRepository.save(wallet);

    const type = adjustment > 0 ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL;
    await this.createTransaction(userId, wallet.id, type, Math.abs(Number(adjustment)), wallet.currency, description);

    return wallet;
  }

  async getWalletAnalytics(userId: string): Promise<any> {
    const transactions = await this.transactionRepository.find({ where: { userId } });
    const totalDeposits = transactions.filter(t => t.type === TransactionType.DEPOSIT).reduce((sum, t) => sum + Number(t.amount), 0);
    const totalWithdrawals = transactions.filter(t => t.type === TransactionType.WITHDRAWAL).reduce((sum, t) => sum + Number(t.amount), 0);
    const totalRefunds = transactions.filter(t => t.type === TransactionType.REFUND).reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalDeposits,
      totalWithdrawals,
      totalRefunds,
      netBalance: totalDeposits - totalWithdrawals + totalRefunds,
    };
  }

  async checkFraud(userId: string, amount: number): Promise<boolean> {
    const recentTransactions = await this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const totalRecent = recentTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    if (totalRecent + amount > 50000) {
      return true;
    }
    return false;
  }

  async integrateWithService(userId: string, service: string, data: any): Promise<any> {
    return { userId, service, data };
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