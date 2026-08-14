import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProjectMessageDocument = ProjectMessageModel & Document;

@Schema({
  timestamps: true,
  collection: 'project_messages',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ProjectMessageModel {
  @Prop({ required: true, index: true, trim: true })
  projectId: string;

  @Prop({ required: true, index: true, trim: true })
  senderId: string;

  @Prop({ required: true, trim: true })
  senderName: string;

  @Prop({ default: 'general', enum: ['general', 'update', 'comment', 'system'] })
  messageType: string;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ default: true })
  isVisible: boolean;

  @Prop({ default: 'seen' })
  status: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const ProjectMessageSchema = SchemaFactory.createForClass(ProjectMessageModel);
ProjectMessageSchema.index({ projectId: 1, createdAt: 1 });
ProjectMessageSchema.index({ senderId: 1, createdAt: -1 });
