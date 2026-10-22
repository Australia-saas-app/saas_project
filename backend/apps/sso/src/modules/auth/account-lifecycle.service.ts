import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { User, UserStatus } from '../../entities/user.entity';

@Injectable()
export class AccountLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AccountLifecycleService.name);
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit() {
    // Run 30 seconds after server boot, then repeat every 1 hour
    const initialDelay = setTimeout(() => {
      this.runAutomatedLifecycleChecks().catch((err) => {
        this.logger.error(`Error during initial lifecycle check: ${err.message}`, err.stack);
      });
    }, 30000);

    this.checkInterval = setInterval(() => {
      this.runAutomatedLifecycleChecks().catch((err) => {
        this.logger.error(`Error during recurring lifecycle check: ${err.message}`, err.stack);
      });
    }, 60 * 60 * 1000); // 1 hour interval
  }

  onModuleDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Main Lifecycle Automation Routine:
   * 1. 180-Day Inactivity Check: Active -> Dormant
   * 2. 60-Day Deactivation Expiry: Deactivated -> Closed
   */
  async runAutomatedLifecycleChecks(): Promise<{
    dormantCount: number;
    closedCount: number;
    details: Array<{ userId: string; email: string; from: string; to: string; reason: string }>;
  }> {
    this.logger.log('Executing automated account lifecycle and policy compliance checks...');
    const details: Array<{ userId: string; email: string; from: string; to: string; reason: string }> = [];

    let dormantCount = 0;
    let closedCount = 0;

    // ── 1. Check 180-day Inactivity -> Dormant (Image 3 Policy) ────────────
    try {
      const inactivityThreshold = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      // Find active users whose lastActiveAt is older than 180 days (or null with old createdAt)
      const inactiveUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.status = :activeStatus', { activeStatus: UserStatus.ACTIVE })
        .andWhere(
          '(user.lastActiveAt < :threshold OR (user.lastActiveAt IS NULL AND user.createdAt < :threshold))',
          { threshold: inactivityThreshold }
        )
        .getMany();

      for (const user of inactiveUsers) {
        const now = new Date();
        const historyEntry: NonNullable<User['statusHistory']>[number] = {
          fromStatus: UserStatus.ACTIVE,
          status: UserStatus.DORMANT,
          reason: 'Automated transition: 180 days of platform inactivity (Policy Image 3 Requirement)',
          changedBy: 'System Lifecycle Daemon',
          changedAt: now.toISOString(),
          isOverride: false,
        };

        user.status = UserStatus.DORMANT;
        user.statusHistory = Array.isArray(user.statusHistory)
          ? [...user.statusHistory, historyEntry]
          : [historyEntry];

        await this.userRepository.save(user);
        dormantCount++;
        details.push({
          userId: user.userId,
          email: user.email,
          from: UserStatus.ACTIVE,
          to: UserStatus.DORMANT,
          reason: historyEntry.reason || '',
        });

        this.logger.warn(`User '${user.email}' (${user.userId}) transitioned to DORMANT due to 180-day inactivity.`);
      }
    } catch (e: any) {
      this.logger.error(`Failed to process 180-day inactivity checks: ${e.message}`);
    }

    // ── 2. Check 60-day Deactivation Expiry -> Closed (Image 3 Policy) ───────
    try {
      const deactivationThreshold = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      const expiredDeactivatedUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.status = :deactivatedStatus', { deactivatedStatus: UserStatus.DEACTIVATED })
        .andWhere('user.deactivatedAt < :threshold', { threshold: deactivationThreshold })
        .getMany();

      for (const user of expiredDeactivatedUsers) {
        const now = new Date();
        const historyEntry: NonNullable<User['statusHistory']>[number] = {
          fromStatus: UserStatus.DEACTIVATED,
          status: UserStatus.CLOSED,
          reason: 'Automated transition: 60-day account restoration recovery window expired (Policy Image 3 Requirement)',
          changedBy: 'System Lifecycle Daemon',
          changedAt: now.toISOString(),
          isOverride: false,
        };

        user.status = UserStatus.CLOSED;
        user.statusHistory = Array.isArray(user.statusHistory)
          ? [...user.statusHistory, historyEntry]
          : [historyEntry];

        await this.userRepository.save(user);
        closedCount++;
        details.push({
          userId: user.userId,
          email: user.email,
          from: UserStatus.DEACTIVATED,
          to: UserStatus.CLOSED,
          reason: historyEntry.reason || '',
        });

        this.logger.warn(`User '${user.email}' (${user.userId}) transitioned to CLOSED after 60-day recovery expiry.`);
      }
    } catch (e: any) {
      this.logger.error(`Failed to process 60-day deactivation checks: ${e.message}`);
    }

    this.logger.log(`Lifecycle checks completed: ${dormantCount} set to Dormant, ${closedCount} set to Closed.`);
    return { dormantCount, closedCount, details };
  }
}
