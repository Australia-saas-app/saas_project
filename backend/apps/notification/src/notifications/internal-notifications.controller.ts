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
    const { userId, userIds, type, title, message, priority, data } = body;

    // Build payload
    const payload = {
      type,
      title,
      message,
      priority,
      href: data?.href,
    };

    const ids = userIds || (userId ? [userId] : []);

    for (const id of ids) {
      await this.notificationsService.createNotification(
        { type, title, message, priority, data },
        id,
      );
    }

    return { success: true };
  }
}
