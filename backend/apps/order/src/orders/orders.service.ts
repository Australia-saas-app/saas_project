import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  AccountType,
  AdminFile,
  Order,
  OrderAccess,
  OrderDocument,
  OrderStatus,
  OrderType,
  PaymentRecord,
} from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { CreateOrderDto, DocumentDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AdminOrderQueryDto, OrderQueryDto } from './dto/order-query.dto';
import { StatusChangeDto } from './dto/status-change.dto';
import { AddProfitDto } from './dto/add-profit.dto';
import { AddFilesDto } from './dto/add-files.dto';
import { AddPaymentDto } from './dto/add-payment.dto';

interface UserContext {
  userId: string;
  accountType: string;
}

interface AdminContext {
  adminId: string;
  email: string;
  role: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  analytics?: Record<string, any>;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderStatusHistory)
    private readonly historyRepository: Repository<OrderStatusHistory>,
  ) {}

  async createOrder(dto: CreateOrderDto, context: UserContext) {
    const accountType = this.normalizeAccountType(context.accountType);
    const order = this.ordersRepository.create({
      orderCode: await this.generateOrderCode(),
      orderType: dto.orderType,
      status: OrderStatus.PENDING,
      serviceName: dto.serviceName,
      createdById: context.userId,
      createdByType: accountType,
      createdByName: dto.clientInfo.fullName,
      createdByEmail: dto.clientInfo.email,
      createdByPhone: dto.clientInfo.phone,
      clientInfo: dto.clientInfo,
      orderDetails: dto.orderDetails ?? {},
      pricing: this.buildPricing(dto),
      referenceName: dto.referenceName,
      description: dto.description,
      access: dto.access ?? OrderAccess.EVERYONE,
      isPublic: dto.isPublic ?? false,
      chatEnabled: dto.chatEnabled ?? true,
      documents: this.formatDocuments(dto.documents, context.userId),
    });

    const saved = await this.ordersRepository.save(order);
    await this.appendHistory(saved, OrderStatus.PENDING, context.userId, accountType);

    return this.getOrderForOwner(saved.orderCode, context);
  }

  async getOrderForOwner(orderCode: string, context: UserContext) {
    const order = await this.ordersRepository.findOne({
      where: { orderCode, createdById: context.userId },
      relations: ['statusHistory'],
      order: { statusHistory: { createdAt: 'DESC' } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async listOrdersForOwner(
    query: OrderQueryDto,
    context: UserContext,
  ): Promise<PaginatedResponse<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.ordersRepository.createQueryBuilder('order');
    qb.where('order.createdById = :userId', { userId: context.userId });
    this.applyFilters(qb, query);

    qb.orderBy('order.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    const response: PaginatedResponse<Order> = {
      data,
      pagination: this.buildPagination(page, limit, total),
    };

    if (query.includeAnalytics) {
      response.analytics = await this.buildAnalytics({
        createdById: context.userId,
        query,
      });
    }

    return response;
  }

  async updateOrderAsOwner(
    orderCode: string,
    dto: UpdateOrderDto,
    context: UserContext,
  ) {
    const order = await this.ordersRepository.findOne({
      where: { orderCode, createdById: context.userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Only orders in pending status can be edited by the requester',
      );
    }
    this.ordersRepository.merge(order, {
      serviceName: dto.serviceName ?? order.serviceName,
      referenceName: dto.referenceName ?? order.referenceName,
      description: dto.description ?? order.description,
      clientInfo: dto.clientInfo ?? order.clientInfo,
      orderDetails: dto.orderDetails ?? order.orderDetails,
      access: dto.access ?? order.access,
      isPublic:
        typeof dto.isPublic === 'boolean' ? dto.isPublic : order.isPublic,
      chatEnabled:
        typeof dto.chatEnabled === 'boolean' ? dto.chatEnabled : order.chatEnabled,
    });
    await this.ordersRepository.save(order);
    return order;
  }

  async addDocuments(orderCode: string, docs: DocumentDto[], context: UserContext) {
    const order = await this.ordersRepository.findOne({
      where: { orderCode, createdById: context.userId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (![OrderStatus.PENDING, OrderStatus.WORKING].includes(order.status)) {
      throw new BadRequestException(
        'Documents can only be updated while the order is pending or working',
      );
    }
    const newDocs = this.formatDocuments(docs, context.userId);
    order.documents = [...(order.documents ?? []), ...newDocs];
    await this.ordersRepository.save(order);
    return order.documents;
  }

  async getPublicRealEstateOrders(query: OrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.ordersRepository.createQueryBuilder('order');
    qb.where('order.orderType = :type', { type: OrderType.REAL_ESTATE });
    qb.andWhere('order.isPublic = true');
    qb.andWhere('order.status IN (:...statuses)', {
      statuses: [OrderStatus.WORKING, OrderStatus.DELIVERY],
    });
    this.applyFilters(qb, query, { allowStatus: false, allowOrderType: false });
    qb.orderBy('order.updatedAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async listAdminOrders(query: AdminOrderQueryDto): Promise<PaginatedResponse<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.ordersRepository.createQueryBuilder('order');
    this.applyFilters(qb, query, { createdByType: query.createdByType });

    if (query.statusEquals) {
      qb.andWhere('order.status = :statusEquals', {
        statusEquals: query.statusEquals,
      });
    }
    if (query.typeEquals) {
      qb.andWhere('order.orderType = :typeEquals', {
        typeEquals: query.typeEquals,
      });
    }

    qb.orderBy('order.createdAt', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    const response: PaginatedResponse<Order> = {
      data,
      pagination: this.buildPagination(page, limit, total),
    };

    if (query.includeAnalytics) {
      response.analytics = await this.buildAnalytics({ query });
    }

    return response;
  }

  async getAdminOrder(orderCode: string) {
    const order = await this.ordersRepository.findOne({
      where: { orderCode },
      relations: ['statusHistory'],
      order: { statusHistory: { createdAt: 'DESC' } },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateOrderAsAdmin(
    orderCode: string,
    dto: UpdateOrderDto,
    admin: AdminContext,
  ) {
    const order = await this.getAdminOrder(orderCode);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be edited');
    }
    this.ordersRepository.merge(order, {
      ...dto,
      orderDetails: dto.orderDetails ?? order.orderDetails,
      clientInfo: dto.clientInfo ?? order.clientInfo,
      access: dto.access ?? order.access,
      isPublic:
        typeof dto.isPublic === 'boolean' ? dto.isPublic : order.isPublic,
      chatEnabled:
        typeof dto.chatEnabled === 'boolean' ? dto.chatEnabled : order.chatEnabled,
    });
    const saved = await this.ordersRepository.save(order);
    await this.appendHistory(saved, OrderStatus.PENDING, admin.email, admin.role);
    return saved;
  }

  async changeStatus(
    orderCode: string,
    dto: StatusChangeDto,
    admin: AdminContext,
  ) {
    const order = await this.getAdminOrder(orderCode);
    this.ensureStatusChangeAllowed(order.status, dto.status);
    order.status = dto.status;
    const saved = await this.ordersRepository.save(order);
    await this.appendHistory(saved, dto.status, admin.email, admin.role, dto.reason);
    return saved;
  }

  async addProfit(orderCode: string, dto: AddProfitDto, admin: AdminContext) {
    const order = await this.getAdminOrder(orderCode);
    if (order.status !== OrderStatus.WAITING) {
      throw new BadRequestException(
        'Profit can only be added when the order is in waiting status',
      );
    }
    order.pricing.profitAmount += dto.profitAmount;
    await this.ordersRepository.save(order);
    await this.appendHistory(order, order.status, admin.email, admin.role, 'Profit updated');
    return order.pricing;
  }

  async addAdminFiles(orderCode: string, dto: AddFilesDto, admin: AdminContext) {
    const order = await this.getAdminOrder(orderCode);
    if (
      ![OrderStatus.WORKING, OrderStatus.COMPLETE, OrderStatus.DELIVERY].includes(
        order.status,
      )
    ) {
      throw new BadRequestException(
        'Admin files can only be attached while the order is working, complete, or delivery',
      );
    }
    const files: AdminFile[] = dto.files.map((file) => ({
      fileId: randomUUID(),
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      addedBy: admin.email,
      addedAt: new Date().toISOString(),
    }));
    order.adminFiles = [...(order.adminFiles ?? []), ...files];
    await this.ordersRepository.save(order);
    return order.adminFiles;
  }

  async recordPayment(orderCode: string, dto: AddPaymentDto, actor: AdminContext) {
    const order = await this.getAdminOrder(orderCode);
    const payment: PaymentRecord = {
      paymentId: dto.paymentId ?? randomUUID(),
      amount: dto.amount,
      currency: dto.currency,
      method: dto.method,
      status: dto.status ?? 'succeeded',
      transactionId: dto.transactionId,
      paidAt: dto.paidAt ?? new Date().toISOString(),
      note: dto.note,
    };
    order.pricing.paymentHistory = [...(order.pricing.paymentHistory ?? []), payment];
    order.pricing.paidAmount += dto.amount;
    order.pricing.dueAmount = Math.max(
      order.pricing.totalAmount - order.pricing.paidAmount,
      0,
    );

    if (order.status === OrderStatus.PAYMENT && order.pricing.paidAmount > 0) {
      order.status = OrderStatus.WAITING;
      await this.appendHistory(order, OrderStatus.WAITING, actor.email, actor.role, 'Initial payment received');
    }

    const saved = await this.ordersRepository.save(order);
    await this.appendHistory(
      saved,
      saved.status,
      actor.email,
      actor.role,
      'Payment recorded',
    );
    return saved.pricing;
  }

  async deleteOrder(orderCode: string) {
    const order = await this.ordersRepository.findOne({ where: { orderCode } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    await this.ordersRepository.remove(order);
    return { success: true };
  }

  async getStatusHistory(orderCode: string) {
    const order = await this.getAdminOrder(orderCode);
    return order.statusHistory ?? [];
  }

  async getOrderPayments(orderCode: string) {
    const order = await this.getAdminOrder(orderCode);
    const payments = order.pricing?.paymentHistory ?? [];
    return {
      success: true,
      data: {
        orderCode: order.orderCode,
        payments,
      },
    };
  }

  private async appendHistory(
    order: Order,
    status: OrderStatus,
    actor: string,
    actorType?: string,
    reason?: string,
  ) {
    await this.historyRepository.save({
      order,
      orderId: order.id,
      status,
      changedBy: actor,
      changedByType: actorType,
      reason,
    });
  }

  private formatDocuments(docs: DocumentDto[] | undefined, userId: string): OrderDocument[] {
    if (!docs?.length) {
      return [];
    }
    const now = new Date().toISOString();
    return docs.map((doc) => ({
      documentId: randomUUID(),
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      uploadedBy: userId,
      uploadedAt: now,
    }));
  }

  private normalizeAccountType(accountType: string | undefined): AccountType {
    const normalized = (accountType ?? '').toLowerCase();
    if (normalized === AccountType.AFFILIATE) return AccountType.AFFILIATE;
    if (normalized === AccountType.BUSINESS) return AccountType.BUSINESS;
    return AccountType.USER;
  }

  private buildPricing(dto: CreateOrderDto) {
    const totalAmount = dto.pricing?.totalAmount ?? 0;
    const paidAmount = dto.pricing?.paidAmount ?? 0;
    return {
      totalAmount,
      paidAmount,
      profitAmount: 0,
      dueAmount: Math.max(totalAmount - paidAmount, 0),
      currency: dto.pricing?.currency ?? 'USD',
      paymentHistory: [],
    };
  }

  private async generateOrderCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `ORDER${Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, '0')}`;
      const exists = await this.ordersRepository.exist({
        where: { orderCode: candidate },
      });
      if (!exists) {
        return candidate;
      }
    }
    return `ORDER${Date.now()}`;
  }

  private applyFilters(
    qb: SelectQueryBuilder<Order>,
    query: OrderQueryDto,
    options?: { createdByType?: AccountType; allowStatus?: boolean; allowOrderType?: boolean },
  ) {
    if (options?.createdByType) {
      qb.andWhere('order.createdByType = :createdByType', {
        createdByType: options.createdByType,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(order.orderCode ILIKE :search OR order.serviceName ILIKE :search OR order.referenceName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (options?.allowStatus !== false) {
      const statuses = this.parseCsv<OrderStatus>(query.status, Object.values(OrderStatus));
      if (statuses.length) {
        qb.andWhere('order.status IN (:...statuses)', { statuses });
      }
    }

    if (options?.allowOrderType !== false) {
      const orderTypes = this.parseCsv<OrderType>(query.orderType, Object.values(OrderType));
      if (orderTypes.length) {
        qb.andWhere('order.orderType IN (:...orderTypes)', { orderTypes });
      }
    }

    if (query.from) {
      qb.andWhere('order.createdAt >= :fromDate', { fromDate: query.from });
    }
    if (query.to) {
      qb.andWhere('order.createdAt <= :toDate', { toDate: query.to });
    }
  }

  private parseCsv<T extends string>(value: string | undefined, allowed: T[]): T[] {
    if (!value) {
      return [];
    }
    return value
      .split(',')
      .map((item) => item.trim() as T)
      .filter((item) => allowed.includes(item));
  }

  private buildPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  private async buildAnalytics({
    createdById,
    query,
  }: {
    createdById?: string;
    query: OrderQueryDto;
  }) {
    const qb = this.ordersRepository.createQueryBuilder('order');
    qb.select('order.status', 'status');
    qb.addSelect('COUNT(1)', 'count');
    qb.addSelect(
      "COALESCE(SUM((\"order\".\"pricing\"->>'totalAmount')::numeric),0)",
      'projectAmount',
    );
    qb.addSelect(
      "COALESCE(SUM((\"order\".\"pricing\"->>'paidAmount')::numeric),0)",
      'paidAmount',
    );
    qb.addSelect(
      "COALESCE(SUM((\"order\".\"pricing\"->>'dueAmount')::numeric),0)",
      'dueAmount',
    );

    if (createdById) {
      qb.where('order.createdById = :createdById', { createdById });
    } else {
      qb.where('1=1');
    }

    this.applyFilters(qb, query);

    qb.groupBy('order.status');
    const rows = await qb.getRawMany();

    const analytics: Record<string, any> = {
      totals: {
        projectAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        count: 0,
      },
    };

    for (const row of rows) {
      const status = row.status as OrderStatus;
      const count = Number(row.count ?? 0);
      const projectAmount = Number(row.projectAmount ?? 0);
      const paidAmount = Number(row.paidAmount ?? 0);
      const dueAmount = Number(row.dueAmount ?? 0);
      analytics[status] = {
        count,
        projectAmount,
        paidAmount,
        dueAmount,
      };
      analytics.totals.count += count;
      analytics.totals.projectAmount += projectAmount;
      analytics.totals.paidAmount += paidAmount;
      analytics.totals.dueAmount += dueAmount;
    }

    return analytics;
  }

  private ensureStatusChangeAllowed(current: OrderStatus, next: OrderStatus) {
    if (current === next) {
      return;
    }

    const finalStatuses = [
      OrderStatus.DELIVERY,
      OrderStatus.REFUND,
      OrderStatus.CANCEL,
    ];

    if (finalStatuses.includes(current)) {
      throw new BadRequestException('Order is already finalized');
    }

    const orderIndex = [
      OrderStatus.PENDING,
      OrderStatus.PAYMENT,
      OrderStatus.WAITING,
      OrderStatus.WORKING,
      OrderStatus.STOPPED,
      OrderStatus.COMPLETE,
      OrderStatus.DELIVERY,
      OrderStatus.REFUND,
      OrderStatus.CANCEL,
    ];

    const currentIndex = orderIndex.indexOf(current);
    const nextIndex = orderIndex.indexOf(next);

    if (nextIndex === -1) {
      throw new BadRequestException('Unsupported status');
    }

    if (next === OrderStatus.REFUND || next === OrderStatus.CANCEL) {
      return;
    }

    if (nextIndex < currentIndex) {
      throw new BadRequestException('Status cannot move backwards');
    }
  }

  async getChatEnabledOrders(
    context: UserContext,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Order>> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .where('order.createdById = :userId', { userId: context.userId })
      .andWhere('order.status IN (:...statuses)', { statuses: [OrderStatus.PENDING, OrderStatus.WORKING] })
      .andWhere('order.chatEnabled', { chatEnabled: true })
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

