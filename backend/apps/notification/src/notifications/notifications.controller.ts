import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @Request() req: any,
  ) {
    return this.notificationsService.createNotification(createNotificationDto, req.user.userId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate notification from template' })
  @ApiResponse({ status: 201, description: 'Notification generated successfully' })
  async generateNotification(
    @Body() generateDto: { templateId: string; data: any; userIds: string[] },
    @Request() req: any,
  ) {
    return this.notificationsService.generateNotification(generateDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getNotifications(
    @Query() query: GetNotificationsDto,
    @Request() req: any,
  ) {
    return this.notificationsService.getUserNotifications(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  async getNotification(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.notificationsService.getNotification(id, req.user.userId);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.notificationsService.markAsRead(id, req.user?.userId, req.user);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user?.userId, req.user);
  }

  @Delete('all')
  @ApiOperation({ summary: 'Delete all notifications' })
  @ApiResponse({ status: 200, description: 'All notifications deleted successfully' })
  async deleteAllNotifications(@Request() req: any) {
    return this.notificationsService.deleteAllNotifications(req.user?.userId, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  async deleteNotification(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.notificationsService.deleteNotification(id, req.user?.userId, req.user);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getNotificationStats(@Request() req: any) {
    return this.notificationsService.getNotificationStats(req.user.userId);
  }
}