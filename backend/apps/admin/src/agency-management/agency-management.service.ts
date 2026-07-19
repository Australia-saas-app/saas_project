import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User, UserStatus, AccountType } from '../entities/user.entity';
import { AgencyQueryDto, AgencyStatus, BusinessType } from './dto/agency-query.dto';
import { UpdateAgencyStatusDto } from './dto/update-agency-status.dto';
import { AddPenaltyDto } from './dto/add-penalty.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { ChangeAccountOwnerDto } from './dto/change-account-owner.dto';

@Injectable()
export class AgencyManagementService {
  private readonly logger = new Logger(AgencyManagementService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<User>,
    query: AgencyQueryDto,
    includeSearch = true,
  ) {
    // Filter by account type = AGENCY
    qb.andWhere('user.accountType = :accountType', {
      accountType: AccountType.AGENCY,
    });

    if (includeSearch && query.search) {
      const like = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(CAST(user.userId AS text)) LIKE :like OR LOWER(CAST(user.agencyInfo->>'agencyName' AS text)) LIKE :like OR LOWER(CAST(user.email AS text)) LIKE :like OR LOWER(CAST(user.phone AS text)) LIKE :like)",
        { like },
      );
    }

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.businessType) {
      qb.andWhere('user.businessType = :businessType', {
        businessType: query.businessType,
      });
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

  private sanitizeAgency(agency: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = agency as any;
    return rest;
  }

  async getAgencies(query: AgencyQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const skip = (page - 1) * limit;

    const listQb = this.userRepository.createQueryBuilder('user');
    this.applyFilters(listQb, query, true);

    const total = await listQb.getCount();
    const agencies = await listQb
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const sanitizedAgencies = agencies.map((agency) =>
      this.sanitizeAgency(agency),
    );

    const analytics: Record<string, number> = {
      all: total,
      pending: 0,
      inactive: 0,
      active: 0,
      suspended: 0,
      blocked: 0,
      dormant: 0,
      closed: 0,
    };

    const statusMap: [keyof typeof analytics, AgencyStatus][] = [
      ['pending', AgencyStatus.PENDING],
      ['inactive', AgencyStatus.INACTIVE],
      ['active', AgencyStatus.ACTIVE],
      ['suspended', AgencyStatus.SUSPENDED],
      ['blocked', AgencyStatus.BLOCKED],
      ['dormant', AgencyStatus.DORMANT],
      ['closed', AgencyStatus.CLOSED],
    ];

    for (const [key, statusValue] of statusMap) {
      const statusQb = this.userRepository.createQueryBuilder('user');
      this.applyFilters(statusQb, query, false);
      statusQb.andWhere('user.status = :status', { status: statusValue });
      analytics[key] = await statusQb.getCount();
    }

    return {
      success: true,
      data: {
        agencies: sanitizedAgencies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        analytics,
      },
    };
  }

  async getAgencyDetails(agencyId: string) {
    const agency = await this.userRepository.findOne({
      where: { userId: agencyId, accountType: AccountType.AGENCY },
    });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    return {
      success: true,
      data: this.sanitizeAgency(agency),
    };
  }

  async updateAgencyStatus(
    agencyId: string,
    updateStatusDto: UpdateAgencyStatusDto,
    adminEmail: string,
  ) {
    if (!adminEmail) {
      throw new BadRequestException('Admin identity is required');
    }

    const agency = await this.userRepository.findOne({
      where: { userId: agencyId, accountType: AccountType.AGENCY },
    });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    if (agency.status === (updateStatusDto.status as unknown as UserStatus)) {
      throw new BadRequestException(
        `Agency is already in ${updateStatusDto.status} status`,
      );
    }

    const historyEntry = {
      status: agency.status,
      reason: updateStatusDto.reason || 'Status changed',
      changedBy: adminEmail,
      changedAt: new Date().toISOString(),
    };

    const history = Array.isArray(agency.statusHistory)
      ? [...agency.statusHistory, historyEntry]
      : [historyEntry];

    const previousStatus = agency.status;
    agency.statusHistory = history;

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
    
    agency.status = statusMap[statusStr] || (updateStatusDto.status as any);

    await this.userRepository.save(agency);

    return {
      success: true,
      message: `Agency status updated to ${updateStatusDto.status} successfully`,
      data: {
        agencyId: agency.userId,
        previousStatus,
        newStatus: updateStatusDto.status,
        reason: updateStatusDto.reason || null,
        changedBy: adminEmail,
        changedAt: historyEntry.changedAt,
        statusHistory: history,
      },
    };
  }

  async addPenalty(agencyId: string, penaltyDto: AddPenaltyDto, adminEmail: string) {
    const agency = await this.userRepository.findOne({
      where: { userId: agencyId, accountType: AccountType.AGENCY },
    });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    const penaltyEntry = {
      amount: penaltyDto.amount,
      reason: penaltyDto.reason,
      date: new Date().toISOString(),
      addedBy: adminEmail,
    };

    const penalties = Array.isArray((agency as any).penalties)
      ? [...(agency as any).penalties, penaltyEntry]
      : [penaltyEntry];

    (agency as any).penalties = penalties;
    (agency as any).totalPenaltyFee =
      ((agency as any).totalPenaltyFee || 0) + penaltyDto.amount;

    await this.userRepository.save(agency);

    return {
      success: true,
      message: 'Penalty added successfully',
      data: {
        agencyId: agency.userId,
        penalty: penaltyEntry,
        totalPenaltyFee: (agency as any).totalPenaltyFee,
      },
    };
  }

  async updateAgency(agencyId: string, updateDto: UpdateAgencyDto) {
    const agency = await this.userRepository.findOne({
      where: { userId: agencyId, accountType: AccountType.AGENCY },
    });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    Object.assign(agency, updateDto);
    await this.userRepository.save(agency);

    return {
      success: true,
      message: 'Agency updated successfully',
      data: this.sanitizeAgency(agency),
    };
  }

  async changeAccountOwner(
    agencyId: string,
    changeOwnerDto: ChangeAccountOwnerDto,
  ) {
    const agency = await this.userRepository.findOne({
      where: { userId: agencyId, accountType: AccountType.AGENCY },
    });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    // Update primary email or phone
    if (changeOwnerDto.emailOrPhone.includes('@')) {
      agency.email = changeOwnerDto.emailOrPhone;
    } else {
      agency.phone = changeOwnerDto.emailOrPhone;
    }

    await this.userRepository.save(agency);

    return {
      success: true,
      message: 'Account owner updated successfully',
      data: {
        agencyId: agency.userId,
        newEmail: agency.email,
        newPhone: agency.phone,
      },
    };
  }

  async getAgencyActivity(agencyId: string) {
    // TODO: Integrate with activity logs collection (MongoDB)
    this.logger.debug(`Fetching activity logs for agency ${agencyId}`);
    return {
      success: true,
      data: {
        activities: [],
        total: 0,
      },
    };
  }

  async getAgencyOrders(agencyId: string, query: any) {
    // TODO: Integrate with order service
    this.logger.debug(`Fetching orders for agency ${agencyId}`);
    return {
      success: true,
      data: {
        orders: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        analytics: {},
      },
    };
  }

  async getAgencyTransactions(agencyId: string, query: any) {
    // TODO: Integrate with payment service
    this.logger.debug(`Fetching transactions for agency ${agencyId}`);
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

