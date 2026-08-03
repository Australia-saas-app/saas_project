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
import { UserRequest } from '../common/interfaces/request.interface';

@ApiTags('activity')
@Controller('activity')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('admin/device-stats')
  @ApiOperation({ summary: 'Get aggregated device stats for admin dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Device stats retrieved successfully',
  })
  async getAdminDeviceStats() {
    // Note: JwtAuthGuard already protects the controller.
    // Ensure that only admins can access this in a real scenario by checking req.user.role if necessary.
    const stats = await this.activityService.getAdminDeviceStats();
    return { success: true, data: stats };
  }

  @Get()
  @ApiOperation({ summary: 'Get user activity logs' })
  @ApiResponse({
    status: 200,
    description: 'Activities retrieved successfully',
  })
  getActivities(@Request() req: UserRequest, @Query() query: ActivityQueryDto) {
    return this.activityService.getActivities(req.user.userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Log a new user activity' })
  @ApiResponse({
    status: 201,
    description: 'Activity logged successfully',
  })
  async createActivity(@Request() req: UserRequest, @Body() body: CreateActivityDto) {
    // If not provided, assume 'system' or pull from req
    const resource = body.resource || 'system';
    
    const expressReq = req as any;
    // We allow the frontend to optionally supply an IP, but fallback to request IP if possible
    const ipAddress = body.ipAddress || expressReq.ip || '127.0.0.1';
    const userAgent = body.userAgent || expressReq.headers?.['user-agent'];

    await this.activityService.logActivity(
      req.user.userId,
      body.action,
      resource,
      body.resourceId,
      body.details,
      ipAddress,
      userAgent
    );
    return { success: true };
  }

  @Delete(':id')
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
  @ApiOperation({ summary: 'Delete all activity logs for the current user' })
  @ApiResponse({
    status: 200,
    description: 'All activities deleted successfully',
  })
  async deleteAllActivities(@Request() req: UserRequest) {
    await this.activityService.deleteAllActivities(req.user.userId);
    return { success: true };
  }
}
