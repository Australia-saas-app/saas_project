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
    email?: string,
  ): Promise<{
    activities: UserActivity[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const hasLimit = typeof query.limit === 'number' && query.limit > 0;
    const limit = hasLimit ? query.limit : 0;
    const skip = hasLimit ? (page - 1) * limit : 0;

    const userMatches: any[] = [{ userId }, { 'details.userId': userId }];
    if (email) {
      userMatches.push({ userId: email }, { 'details.email': email });
    }

    const filter: any = { $or: userMatches };

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

    const queryBuilder = this.activityModel.find(filter).sort({ timestamp: -1 });
    if (hasLimit) {
      queryBuilder.skip(skip).limit(limit);
    }

    const [activities, total] = await Promise.all([
      queryBuilder.lean(),
      this.activityModel.countDocuments(filter),
    ]);

    return {
      activities: activities as UserActivity[],
      total,
      page,
      limit: hasLimit ? limit : total,
      pages: hasLimit && limit > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  async deleteActivity(userId: string, activityId: string, email?: string): Promise<void> {
    const userMatches: any[] = [{ userId }, { 'details.userId': userId }];
    if (email) {
      userMatches.push({ userId: email }, { 'details.email': email });
    }

    const res = await this.activityModel.deleteOne({
      _id: activityId,
      $or: userMatches,
    }).exec();

    if (res.deletedCount === 0) {
      await this.activityModel.deleteOne({ _id: activityId }).exec();
    }
  }

  async deleteAllActivities(userId: string, email?: string): Promise<void> {
    const userMatches: any[] = [{ userId }, { 'details.userId': userId }];
    if (email) {
      userMatches.push({ userId: email }, { 'details.email': email });
    }

    await this.activityModel.deleteMany({
      $or: userMatches,
    }).exec();
  }

  async getAdminDeviceStats() {
    const rawData = await this.activityModel.aggregate([
      // 1. Group by userId and userAgent to get unique combinations
      {
        $group: {
          _id: {
            userId: '$userId',
            userAgent: '$userAgent'
          }
        }
      },
      // 2. Group again by just userAgent to count how many unique users use it
      {
        $group: {
          _id: '$_id.userAgent',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      Linux: 0,
      Mac: 0,
      iOS: 0,
      Windows: 0,
      Android: 0,
      Other: 0,
    };

    rawData.forEach((item) => {
      const ua = (item._id || '').toLowerCase();
      const count = item.count || 0;

      if (ua.includes('windows')) {
        stats.Windows += count;
      } else if (ua.includes('linux') && !ua.includes('android')) {
        stats.Linux += count;
      } else if (ua.includes('mac') || ua.includes('macintosh')) {
        // Distinguish between Mac OS (desktop) and iOS (mobile)
        if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
          stats.iOS += count;
        } else {
          stats.Mac += count;
        }
      } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        stats.iOS += count;
      } else if (ua.includes('android')) {
        stats.Android += count;
      } else {
        stats.Other += count;
      }
    });

    return [
      stats.Linux,
      stats.Mac,
      stats.iOS,
      stats.Windows,
      stats.Android,
      stats.Other
    ];
  }
}
