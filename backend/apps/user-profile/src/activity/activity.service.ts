import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserActivity,
  UserActivitySchema,
} from './entities/user-activity.entity';
import { ActivityQueryDto } from './dto/activity-query.dto';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectModel('UserActivity')
    private readonly activityModel: Model<UserActivity>,
  ) {}

  async logActivity(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const activity = new this.activityModel({
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });

    await activity.save();
    this.logger.debug(`Activity logged: ${action} for user ${userId}`);
  }

  async getActivities(
    userId: string,
    query: ActivityQueryDto,
  ): Promise<{
    activities: UserActivity[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const filter: any = { userId };

    if (query.action) {
      filter.action = query.action;
    }

    if (query.resource) {
      filter.resource = query.resource;
    }

    if (query.startDate || query.endDate) {
      filter.timestamp = {};
      if (query.startDate) {
        filter.timestamp.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.timestamp.$lte = new Date(query.endDate);
      }
    }

    const [activities, total] = await Promise.all([
      this.activityModel
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.activityModel.countDocuments(filter),
    ]);

    return {
      activities: activities as UserActivity[],
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async deleteActivity(userId: string, activityId: string): Promise<void> {
    await this.activityModel.deleteOne({ _id: activityId, userId }).exec();
  }

  async deleteAllActivities(userId: string): Promise<void> {
    await this.activityModel.deleteMany({ userId }).exec();
  }
}
