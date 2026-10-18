import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PenaltyRecord, PenaltyStatus } from './entities/penalty-record.entity';
import { Wallet } from '../../entities/wallet.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class PenaltyService {
  constructor(
    @InjectRepository(PenaltyRecord)
    private readonly penaltyRepository: Repository<PenaltyRecord>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get penalties for current user/business
   */
  async getPenaltiesForUser(userId: string): Promise<PenaltyRecord[]> {
    return this.penaltyRepository.find({
      where: [{ userId }, { businessUserId: userId }],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all penalties (Admin)
   */
  async getAllPenalties(): Promise<PenaltyRecord[]> {
    return this.penaltyRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new penalty record (Admin / System Trigger)
   */
  async createPenalty(dto: {
    userId: string;
    businessUserId?: string;
    reason: string;
    amount: number;
    currency?: string;
  }): Promise<PenaltyRecord> {
    const penaltyId = `PEN-${Date.now().toString().slice(-6)}`;
    const penalty = this.penaltyRepository.create({
      penaltyId,
      userId: dto.userId,
      businessUserId: dto.businessUserId || dto.userId,
      reason: dto.reason,
      amount: Number(dto.amount),
      currency: (dto.currency || 'USD').toUpperCase(),
      status: PenaltyStatus.ACTIVE,
    });

    const saved = await this.penaltyRepository.save(penalty);

    // Update user totalPenaltyFee
    try {
      const user = await this.userRepository.findOne({
        where: [{ userId: dto.userId }, { id: dto.userId }],
      });
      if (user) {
        if (user.agencyInfo) {
          user.agencyInfo.totalPenaltyFee = Number(user.agencyInfo.totalPenaltyFee || 0) + Number(dto.amount);
        }
        (user as any).totalPenaltyFee = Number((user as any).totalPenaltyFee || 0) + Number(dto.amount);
        await this.userRepository.save(user);
      }
    } catch {}

    return saved;
  }

  /**
   * Pay an active penalty from wallet balance
   */
  async payPenalty(userId: string, penaltyRecordId: string): Promise<{ success: boolean; message: string; penalty: PenaltyRecord }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const penalty = await queryRunner.manager.findOne(PenaltyRecord, {
        where: { id: penaltyRecordId },
      });

      if (!penalty) {
        throw new NotFoundException('Penalty record not found');
      }

      if (penalty.status !== PenaltyStatus.ACTIVE) {
        throw new BadRequestException(`This penalty is already ${penalty.status.toLowerCase()}`);
      }

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: [{ userId }, { userId: penalty.userId }, { userId: penalty.businessUserId }],
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found for this account');
      }

      const amount = Number(penalty.amount);
      const balance = Number(wallet.balance || 0);

      if (balance < amount) {
        throw new BadRequestException(`Insufficient wallet balance. Required: $${amount}, Available: $${balance}`);
      }

      // Deduct from wallet balance
      wallet.balance = balance - amount;
      wallet.availableBalance = Math.max(0, Number(wallet.availableBalance || 0) - amount);
      await queryRunner.manager.save(wallet);

      // Record transaction
      const txnId = `TXN-PEN-${Date.now()}`;
      const txn = queryRunner.manager.create(Transaction, {
        transactionId: txnId,
        walletId: wallet.id,
        userId,
        type: TransactionType.WITHDRAWAL,
        amount,
        currency: penalty.currency.toLowerCase(),
        status: TransactionStatus.COMPLETED,
        description: `Penalty payment: ${penalty.reason} (${penalty.penaltyId})`,
        paymentMethod: 'wallet',
        paymentProvider: 'internal_wallet',
        balanceBefore: balance,
        balanceAfter: wallet.balance,
      });
      await queryRunner.manager.save(txn);

      // Update penalty record
      penalty.status = PenaltyStatus.RESOLVED;
      penalty.paidAt = new Date();
      penalty.paidTransactionId = txnId;
      await queryRunner.manager.save(penalty);

      // Reduce totalPenaltyFee on user
      const user = await queryRunner.manager.findOne(User, {
        where: [{ userId }, { id: userId }],
      });
      if (user) {
        if (user.agencyInfo) {
          user.agencyInfo.totalPenaltyFee = Math.max(0, Number(user.agencyInfo.totalPenaltyFee || 0) - amount);
        }
        (user as any).totalPenaltyFee = Math.max(0, Number((user as any).totalPenaltyFee || 0) - amount);
        await queryRunner.manager.save(user);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Penalty ${penalty.penaltyId} successfully paid and resolved`,
        penalty,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
