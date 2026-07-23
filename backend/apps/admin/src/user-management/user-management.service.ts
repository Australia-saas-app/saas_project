import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { User, UserStatus, AccountType } from '../entities/user.entity';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<User>,
    query: UserQueryDto,
    includeSearch = true,
  ) {
    if (includeSearch && query.search) {
      const like = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(CAST(user.userId AS text)) LIKE :like OR LOWER(CAST(user.fullName AS text)) LIKE :like OR LOWER(CAST(user.email AS text)) LIKE :like OR LOWER(CAST(user.phone AS text)) LIKE :like)',
        { like },
      );
    }

    if (query.accountType) {
      qb.andWhere('user.accountType = :accountType', {
        accountType: query.accountType,
      });
    }

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.currency) {
      qb.andWhere('user.currency = :currency', { currency: query.currency });
    }

    if (query.startDate) {
      qb.andWhere('user.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      qb.andWhere('user.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = user as any;
    return rest;
  }

  async getUsers(query: UserQueryDto, token?: string) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user')
      .select([
        'user.userId',
        'user.fullName',
        'user.email',
        'user.phone',
        'user.status',
        'user.accountType',
        'user.currency',
        'user.createdAt',
        'user.updatedAt',
        'user.profilePhoto',
        'user.nationality',
        'user.dateOfBirth',
        'user.governmentId',
        'user.idDocument',
      ]);

    this.applyFilters(qb, query);

    qb.orderBy('user.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    const sanitizedUsers = users.map(user => this.sanitizeUser(user));

    return {
      success: true,
      data: {
        users: sanitizedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getUserDetails(userId: string, token?: string) {
    const user = await this.userRepository.findOne({
      where: { userId },
      select: [
        'userId',
        'fullName',
        'email',
        'phone',
        'status',
        'accountType',
        'currency',
        'createdAt',
        'updatedAt',
        'profilePhoto',
        'nationality',
        'dateOfBirth',
        'governmentId',
        'idDocument',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: this.sanitizeUser(user),
    };
  }

  async updateUserStatus(
    userId: string,
    updateStatusDto: UpdateUserStatusDto,
    adminEmail: string,
    token?: string,
  ) {
    if (!adminEmail) {
      throw new BadRequestException('Admin identity is required');
    }

    if (!updateStatusDto.status) {
      throw new BadRequestException('Status is required');
    }

    const validStatuses = Object.values(UserStatus);
    if (!validStatuses.includes(updateStatusDto.status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Map uppercase/frontend statuses to the proper enum
    const statusStr = (updateStatusDto.status as string).toUpperCase();
    const statusMap: Record<string, UserStatus> = {
      ACTIVE: UserStatus.ACTIVE,
      PENDING: UserStatus.PENDING,
      INACTIVE: UserStatus.INACTIVE,
      SUSPEND: UserStatus.SUSPENDED,
      SUSPENDED: UserStatus.SUSPENDED,
      BLOCK: UserStatus.BLOCKED,
      BLOCKED: UserStatus.BLOCKED,
      DORMANT: UserStatus.DORMANT,
      CLOSED: UserStatus.CLOSED,
    };
    
    user.status = statusMap[statusStr] || updateStatusDto.status;
    await this.userRepository.save(user);

    // TODO: Log status change history

    return {
      success: true,
      message: 'User status updated successfully',
      data: {
        userId,
        newStatus: updateStatusDto.status,
        updatedBy: adminEmail,
      },
    };
  }

  async getUserActivity(userId: string) {
    // TODO: Integrate with activity logs collection (MongoDB)
    this.logger.debug(`Fetching activity logs for user ${userId}`);
    return {
      success: true,
      data: {
        activities: [],
        total: 0,
      },
    };
  }

  async changeAccountOwner(userId: string, emailOrPhone: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (emailOrPhone.includes('@')) {
      user.email = emailOrPhone;
    } else {
      user.phone = emailOrPhone;
    }

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Account owner updated successfully',
      data: {
        userId: user.userId,
        newEmail: user.email,
        newPhone: user.phone,
      },
    };
  }

  async getVerifiedInfo(userId: string) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: {
        userId: user.userId,
        photo: (user as any).profilePhoto,
        fullName: user.fullName,
        nationality: (user as any).nationality,
        dateOfBirth: (user as any).dateOfBirth,
        identityNumber: (user as any).identityNumber,
        identityType: (user as any).identityType, // NID/Passport/Driving License
        documentUrl: (user as any).documentUrl,
      },
    };
  }

  async getUserOrders(userId: string, query: any) {
    // TODO: Integrate with order service
    this.logger.debug(`Fetching orders for user ${userId}`);
    return {
      success: true,
      data: {
        orders: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        analytics: {},
      },
    };
  }

  async getUserTransactions(userId: string, query: any) {
    // TODO: Integrate with payment service
    this.logger.debug(`Fetching transactions for user ${userId}`);
    return {
      success: true,
      data: {
        transactions: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        analytics: {},
      },
    };
  }
}


