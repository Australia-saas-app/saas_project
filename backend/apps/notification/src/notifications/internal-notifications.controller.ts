import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';

@Controller('internal/notifications')
export class InternalNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createInternalNotification(@Body() body: any) {
    const { userId, userIds, role, type, title, message, priority, data } = body;

    // Build payload
    const payload = {
      type,
      title,
      message,
      priority,
      href: data?.href,
    };

    const rawIds = Array.isArray(userIds) ? userIds : userId ? [userId] : [];
    const uniqueIds = Array.from(new Set(rawIds.filter(Boolean)));

    for (const id of uniqueIds) {
      await this.notificationsService.createNotification(
        { type, title, message, priority, data },
        id,
      );
    }

    if (role) {
      await this.notificationsService.createNotification(
        { type, title, message, priority, data },
        'admin',
      );
      this.notificationsGateway.sendToRole(role, payload);
    } else if (uniqueIds.length === 0) {
      await this.notificationsService.createNotification(
        { type, title, message, priority, data },
        'admin',
      );
      this.notificationsGateway.sendToRole('ADMIN', payload);
    }

    return { success: true };
  }
}
