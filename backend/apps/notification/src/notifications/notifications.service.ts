import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotification } from '../entities/user-notification.entity';
import { NotificationLog } from '../entities/notification-log.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { TemplatesService } from '../templates/templates.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(UserNotification)
    private readonly notificationRepository: Repository<UserNotification>,
    @InjectRepository(NotificationLog)
    private readonly logRepository: Repository<NotificationLog>,
    private readonly templatesService: TemplatesService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(
    createNotificationDto: CreateNotificationDto,
    userId: string,
  ) {
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      userId,
      notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isRead: false,
      priority: createNotificationDto.priority || 'medium',
      expiresAt: createNotificationDto.expiresAt ? new Date(createNotificationDto.expiresAt) : null,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Log the notification creation
    await this.logRepository.save({
      notificationId: savedNotification.notificationId,
      userId,
      channel: 'in-app',
      status: 'sent',
      sentAt: new Date(),
    });

    // Emit real-time event
    this.notificationsGateway.sendToUser(userId, {
      id: savedNotification.id,
      title: savedNotification.title,
      message: savedNotification.message,
      type: savedNotification.type,
      href: savedNotification.data?.href,
    });

    return {
      success: true,
      data: savedNotification,
    };
  }

  async generateNotification(
    generateDto: { templateId: string; data: any; userIds: string[] },
    createdBy: string,
  ) {
    const { templateId, data, userIds } = generateDto;

    // Get the template
    const templateResult = await this.templatesService.getTemplate(templateId);
    const template = templateResult.data;

    if (!template.isActive) {
      throw new ForbiddenException('Template is not active');
    }

    // Render the template content with data
    let renderedContent = template.content;
    let renderedSubject = template.subject;

    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      renderedContent = renderedContent.replace(regex, data[key]);
      renderedSubject = renderedSubject.replace(regex, data[key]);
    });

    // Create notifications for all userIds
    const notifications = [];
    const now = new Date();

    for (const userId of userIds) {
      const notification = this.notificationRepository.create({
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: template.type,
        title: renderedSubject,
        message: renderedContent,
        data: { ...data, templateId, createdBy },
        isRead: false,
        priority: 'medium',
        expiresAt: null,
        createdAt: now,
        updatedAt: now,
      });

      const savedNotification = await this.notificationRepository.save(notification);
      notifications.push(savedNotification);

      // Log the notification creation
      await this.logRepository.save({
        notificationId: savedNotification.notificationId,
        userId,
        channel: 'in-app',
        status: 'sent',
        sentAt: now,
      });

      // Emit real-time event
      this.notificationsGateway.sendToUser(userId, {
        id: savedNotification.id,
        title: savedNotification.title,
        message: savedNotification.message,
        type: savedNotification.type,
        href: savedNotification.data?.href,
      });
    }

    return {
      success: true,
      message: `Generated ${notifications.length} notifications from template`,
      data: {
        templateId,
        templateType: template.type,
        notificationsCreated: notifications.length,
        notifications: notifications.map(n => ({
          id: n.id,
          notificationId: n.notificationId,
          userId: n.userId,
        })),
      },
    };
  }

  async getUserNotifications(query: GetNotificationsDto, userContext: any) {
    const { type, isRead, priority, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const userId = typeof userContext === 'string' ? userContext : userContext?.userId || userContext?.adminId;
    const isAdmin =
      typeof userContext === 'object' &&
      (userContext?.role === 'admin' || userContext?.role === 'superadmin' || !!userContext?.adminId);

    const queryBuilder = this.notificationRepository.createQueryBuilder('notification');

    if (isAdmin) {
      queryBuilder.where('(notification.userId = :userId OR notification.userId = :adminRole OR notification.userId IS NULL)', {
        userId,
        adminRole: 'admin',
      });
    } else {
      queryBuilder.where('notification.userId = :userId', { userId });
    }

    // Apply filters
    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    if (priority) {
      queryBuilder.andWhere('notification.priority = :priority', { priority });
    }

    // Apply sorting
    queryBuilder.orderBy(`notification.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return {
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getNotification(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return {
      success: true,
      data: notification,
    };
  }

  async markAsRead(id: string, userId: string, userContext?: any) {
    const isAdmin =
      typeof userContext === 'object' &&
      (userContext?.role?.toLowerCase() === 'admin' || userContext?.role?.toLowerCase() === 'superadmin' || !!userContext?.adminId);

    let notification = null;
    if (isAdmin) {
      notification = await this.notificationRepository.findOne({
        where: [{ id }, { notificationId: id }],
      });
    } else {
      notification = await this.notificationRepository.findOne({
        where: [
          { id, userId },
          { notificationId: id, userId },
        ],
      });
    }

    if (!notification) {
      return { success: true, message: 'Notification marked as read' };
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);

      try {
        await this.logRepository.save({
          notificationId: notification.notificationId,
          userId: userId || 'admin',
          channel: 'in-app',
          status: 'read',
          readAt: new Date(),
        });
      } catch {}
    }

    return {
      success: true,
      message: 'Notification marked as read',
      data: notification,
    };
  }

  async markAllAsRead(userId: string, userContext?: any) {
    const isAdmin =
      typeof userContext === 'object' &&
      (userContext?.role?.toLowerCase() === 'admin' || userContext?.role?.toLowerCase() === 'superadmin' || !!userContext?.adminId);

    if (isAdmin) {
      await this.notificationRepository
        .createQueryBuilder()
        .update()
        .set({ isRead: true, readAt: new Date() })
        .where('userId = :userId OR userId = :adminRole OR userId = :adminUpper OR userId IS NULL', {
          userId: userId || 'admin',
          adminRole: 'admin',
          adminUpper: 'ADMIN',
        })
        .execute();
    } else {
      await this.notificationRepository.update({ userId, isRead: false }, { isRead: true, readAt: new Date() });
    }

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  async deleteNotification(id: string, userId: string, userContext?: any) {
    const isAdmin =
      typeof userContext === 'object' &&
      (userContext?.role?.toLowerCase() === 'admin' || userContext?.role?.toLowerCase() === 'superadmin' || !!userContext?.adminId);

    let notification = null;
    if (isAdmin) {
      notification = await this.notificationRepository.findOne({
        where: [{ id }, { notificationId: id }],
      });
    } else {
      notification = await this.notificationRepository.findOne({
        where: [
          { id, userId },
          { notificationId: id, userId },
        ],
      });
    }

    if (!notification) {
      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    }

    await this.notificationRepository.remove(notification);

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  async deleteAllNotifications(userId: string, userContext?: any) {
    const isAdmin =
      typeof userContext === 'object' &&
      (userContext?.role?.toLowerCase() === 'admin' || userContext?.role?.toLowerCase() === 'superadmin' || !!userContext?.adminId);

    if (isAdmin) {
      await this.notificationRepository
        .createQueryBuilder()
        .delete()
        .where('userId = :userId OR userId = :adminRole OR userId = :adminUpper OR userId IS NULL', {
          userId: userId || 'admin',
          adminRole: 'admin',
          adminUpper: 'ADMIN',
        })
        .execute();
    } else {
      await this.notificationRepository.delete({ userId });
    }

    return {
      success: true,
      message: 'All notifications deleted successfully',
    };
  }

  async getNotificationStats(userId: string) {
    const total = await this.notificationRepository.count({ where: { userId } });
    const unread = await this.notificationRepository.count({ where: { userId, isRead: false } });
    const read = total - unread;

    // Get counts by type
    const typeStats = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('notification.userId = :userId', { userId })
      .groupBy('notification.type')
      .getRawMany();

    // Get counts by priority
    const priorityStats = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('notification.userId = :userId', { userId })
      .groupBy('notification.priority')
      .getRawMany();

    return {
      success: true,
      data: {
        total,
        unread,
        read,
        typeBreakdown: typeStats,
        priorityBreakdown: priorityStats,
      },
    };
  }
}