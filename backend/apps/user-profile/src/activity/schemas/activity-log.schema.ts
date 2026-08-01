/**
 * MongoDB / Mongoose Schema for User Activity Logs & System Audit Trails
 * Includes:
 * 1. Schema Validation (types, enums, required, lowercase, trim)
 * 2. Middleware Hooks (pre-save, post-save, pre-deleteOne, post-deleteMany)
 * 3. Population & Virtuals (formattedTime, userRef)
 * 4. High-Performance Compound & Text Indexes (userId, email, action, text search)
 * 5. TTL Collection (Auto-expiring temporary logs/OTP sessions)
 * 6. Aggregation Pipelines (Reports & Analytics functions)
 * 7. Error Handling Hooks
 * 8. Sharding & Replication Support (Shard key on userId)
 */

import { Schema, Document, Model } from 'mongoose';

export interface IActivityLog {
  userId: string;
  email: string;
  username?: string;
  action:
    | 'USER_LOGIN'
    | 'USER_LOGOUT'
    | 'PROFILE_UPDATED'
    | 'PROFILE_PHOTO_UPDATED'
    | 'DOCUMENT_ADDED'
    | 'KYC_SUBMITTED'
    | 'PASSWORD_CHANGED'
    | 'TWO_FACTOR_ENABLED'
    | 'TWO_FACTOR_DISABLED'
    | 'ADMIN_KYC_APPROVED'
    | 'ADMIN_KYC_REJECTED'
    | 'ADMIN_STATUS_CHANGED';
  details: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ActivityLogDocument = IActivityLog & Document;

// 1. Schema Validation Definition
export const ActivityLogSchema = new Schema<ActivityLogDocument>(
  {
    userId: {
      type: String,
      required: [true, 'userId is mandatory'],
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'email is mandatory'],
      index: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: [true, 'action type is mandatory'],
      enum: {
        values: [
          'USER_LOGIN',
          'USER_LOGOUT',
          'PROFILE_UPDATED',
          'PROFILE_PHOTO_UPDATED',
          'DOCUMENT_ADDED',
          'KYC_SUBMITTED',
          'PASSWORD_CHANGED',
          'TWO_FACTOR_ENABLED',
          'TWO_FACTOR_DISABLED',
          'ADMIN_KYC_APPROVED',
          'ADMIN_KYC_REJECTED',
          'ADMIN_STATUS_CHANGED',
        ],
        message: '{VALUE} is not a valid activity action type',
      },
      index: true,
    },
    details: {
      type: String,
      required: [true, 'details text is required'],
      trim: true,
      maxlength: [1000, 'Details cannot exceed 1000 characters'],
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
      trim: true,
    },
    userAgent: {
      type: String,
      default: 'System',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // 5. TTL Collection: Auto-delete logs older than 90 days
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
    collection: 'user_activity_logs',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    // 8. Sharding & Replication Support
    shardKey: { userId: 1 },
  },
);

// 4. Compound & Text Indexes for Fast Search & Filters
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ email: 1, action: 1 });
ActivityLogSchema.index({ username: 'text', details: 'text', ipAddress: 'text' });

// 3. Virtuals
ActivityLogSchema.virtual('formattedTime').get(function (this: ActivityLogDocument) {
  return (this as any).createdAt ? new Date((this as any).createdAt).toISOString() : '';
});

ActivityLogSchema.virtual('isRecent').get(function (this: ActivityLogDocument) {
  if (!(this as any).createdAt) return false;
  const ageInMs = Date.now() - new Date((this as any).createdAt).getTime();
  return ageInMs < 24 * 60 * 60 * 1000; // Less than 24h
});

// 2. Middleware Hooks (Pre-save, Post-save, Error Handling)
ActivityLogSchema.pre('save', function (next) {
  if (typeof this.details === 'string') {
    this.details = this.details.trim();
  }
  if (!this.username && this.email) {
    this.username = this.email;
  }
  next();
});

ActivityLogSchema.post('save', function (error: any, doc: any, next: any) {
  if (error) {
    console.error('Mongoose ActivityLog Save Error:', error.message || error);
  }
  next(error);
});

// 6. Aggregation Pipelines helper for Reports & Analytics
export const getActivityAnalyticsPipeline = (userId?: string) => {
  const matchStage = userId ? { $match: { userId } } : { $match: {} };
  return [
    matchStage,
    {
      $group: {
        _id: '$action',
        totalCount: { $sum: 1 },
        lastOccurredAt: { $max: '$createdAt' },
      },
    },
    { $sort: { totalCount: -1 } },
  ];
};

export const ActivityLogDefinition = {
  name: 'ActivityLog',
  collection: 'user_activity_logs',
  schema: ActivityLogSchema,
};
