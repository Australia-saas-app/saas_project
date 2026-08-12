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
    const { userId, targetRole, type, title, message, priority, data, isRoleBased } = body;

    // Build payload
    const payload = {
      type,
      title,
      message,
      priority,
      href: data?.href,
    };

    if (isRoleBased && targetRole) {
      // Emit to role (e.g. 'ADMIN')
      this.notificationsGateway.sendToRole(targetRole, payload);
    } else if (userId) {
      // Persist in DB and emit to user
      await this.notificationsService.createNotification(
        { type, title, message, priority, data },
        userId,
      );
    }

    return { success: true };
  }
}
