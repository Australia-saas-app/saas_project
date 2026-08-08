import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { UserRequest } from '../common/interfaces/request.interface';

@ApiTags('activity')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('admin/device-stats')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get aggregated device stats for admin dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Device stats retrieved successfully',
  })
  async getAdminDeviceStats() {
    const stats = await this.activityService.getAdminDeviceStats();
    return { success: true, data: stats };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user activity logs' })
  @ApiResponse({
    status: 200,
    description: 'Activities retrieved successfully',
  })
  getActivities(@Request() req: UserRequest, @Query() query: ActivityQueryDto) {
    return this.activityService.getActivities(req.user.userId, query);
  }

  @Post('internal')
  @ApiOperation({ summary: 'Internal backend-to-backend activity logging' })
  async createInternalActivity(@Body() body: CreateActivityDto) {
    const resource = body.resource || 'system';
    const targetUserId = (body.details as any)?.userId || body.resourceId || 'system';
    return this.activityService.logActivity(
      targetUserId,
      body.action,
      resource,
      body.resourceId,
      body.details,
      body.ipAddress || '127.0.0.1',
      body.userAgent || 'Internal-Backend'
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Log a new user activity' })
  @ApiResponse({
    status: 201,
    description: 'Activity logged successfully',
  })
  async createActivity(@Request() req: UserRequest, @Body() body: CreateActivityDto) {
    const resource = body.resource || 'system';

    const expressReq = req as any;
    const ipAddress = body.ipAddress || expressReq.ip || '127.0.0.1';
    const userAgent = body.userAgent || expressReq.headers?.['user-agent'];

    const targetUserId = (body.details as any)?.userId || body.resourceId || req.user.userId;

    await this.activityService.logActivity(
      targetUserId,
      body.action,
      resource,
      body.resourceId,
      body.details,
      ipAddress,
      userAgent,
    );
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a single activity log' })
  @ApiResponse({
    status: 200,
    description: 'Activity deleted successfully',
  })
  async deleteActivity(@Request() req: UserRequest, @Param('id') id: string) {
    await this.activityService.deleteActivity(req.user.userId, id);
    return { success: true };
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete all activity logs for the current user' })
  @ApiResponse({
    status: 200,
    description: 'All activities deleted successfully',
  })
  async deleteAllActivities(@Request() req: UserRequest) {
    await this.activityService.deleteAllActivities(req.user.userId);
    return { success: true };
  }

  @Delete('admin/:userId')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Delete all activity logs for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'All activities deleted successfully for the user',
  })
  async deleteUserActivitiesByAdmin(@Param('userId') userId: string) {
    await this.activityService.deleteAllActivities(userId);
    return { success: true };
  }
}
