import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { InternalNotificationsController } from './internal-notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { UserNotification } from '../entities/user-notification.entity';
import { NotificationLog } from '../entities/notification-log.entity';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserNotification, NotificationLog]),
    TemplatesModule,
  ],
  controllers: [NotificationsController, InternalNotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}