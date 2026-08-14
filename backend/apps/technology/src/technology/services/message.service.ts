import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { ProjectMessage, MessageType } from '../entities/project-message.entity';
import { ProjectParticipant, ParticipantRole } from '../entities/project-participant.entity';
import { Project } from '../entities/project.entity';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageDto } from '../dto/update-message.dto';
import {
  ProjectMessageModel,
  ProjectMessageDocument,
} from '../schemas/project-message.schema';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectModel(ProjectMessageModel.name)
    private readonly projectMessageMongoModel: Model<ProjectMessageDocument>,
    @InjectRepository(ProjectMessage)
    private readonly messageRepository: Repository<ProjectMessage>,
    @InjectRepository(ProjectParticipant)
    private readonly participantRepository: Repository<ProjectParticipant>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  private async triggerNotification(payload: {
    userId: string;
    type: string;
    title: string;
    message: string;
    href?: string;
  }) {
    try {
      const notificationUrl =
        process.env.NOTIFICATION_SERVICE_URL ||
        'http://saas-backend-notification:3014/notification-service/internal/notifications';
      await fetch(notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          priority: 'medium',
          data: { href: payload.href },
        }),
      }).catch(() => undefined);
    } catch {
      // ignore
    }
  }

  async create(
    projectId: string,
    createDto: CreateMessageDto,
    senderId: string,
    senderName: string,
  ): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: { projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Direct access check: Client, Assigned Business, or Admin
    const isOwner = project.clientId === senderId;
    const isAssignedBiz = project.assignedBusinessId === senderId;
    const isAdmin = senderId === 'admin' || senderId.startsWith('admin_');

    if (!isOwner && !isAssignedBiz && !isAdmin) {
      const participant = await this.participantRepository.findOne({
        where: { projectId: project.id, userId: senderId },
      });
      if (!participant || participant.role === ParticipantRole.VIEWER) {
        throw new ForbiddenException('You do not have permission to post messages in this project');
      }
    }

    // 1. Save directly into MongoDB (Mongoose Collection: 'project_messages')
    let mongoSavedDoc: any = null;
    try {
      mongoSavedDoc = await this.projectMessageMongoModel.create({
        projectId: project.projectId,
        senderId,
        senderName: senderName || senderId,
        messageType: createDto.messageType || 'general',
        content: createDto.content,
        isVisible: true,
        status: 'delivered',
        metadata: {
          projectNumericId: project.id,
          projectTitle: project.title,
        },
      });
    } catch (e: any) {
      this.logger.error('Failed to save message to MongoDB', e.message);
    }

    // 2. Also save to PostgreSQL for ACID relational integrity
    try {
      const pgMsg = this.messageRepository.create({
        projectId: project.id,
        senderId,
        senderName: senderName || senderId,
        messageType: createDto.messageType || MessageType.GENERAL,
        content: createDto.content,
        isVisible: true,
      });
      await this.messageRepository.save(pgMsg);
    } catch {
      // PostgreSQL fallback
    }

    // Identify recipient to notify
    let recipientId: string | null = null;
    if (isOwner && project.assignedBusinessId) {
      recipientId = project.assignedBusinessId;
    } else if (isAssignedBiz && project.clientId) {
      recipientId = project.clientId;
    }

    if (recipientId) {
      this.triggerNotification({
        userId: recipientId,
        type: 'PROJECT_CHAT_MESSAGE',
        title: `New Message on "${project.title}"`,
        message: `${senderName || 'Team member'}: ${createDto.content.slice(0, 80)}`,
        href: `/technical`,
      });
    }

    return mongoSavedDoc
      ? {
          id: mongoSavedDoc._id?.toString() || mongoSavedDoc.id,
          projectId: project.projectId,
          senderId: mongoSavedDoc.senderId,
          senderName: mongoSavedDoc.senderName,
          messageType: mongoSavedDoc.messageType,
          content: mongoSavedDoc.content,
          createdAt: mongoSavedDoc.createdAt,
          status: 'delivered',
        }
      : {
          id: Date.now(),
          projectId: project.projectId,
          senderId,
          senderName,
          content: createDto.content,
          createdAt: new Date().toISOString(),
        };
  }

  async findAll(projectId: string, userId?: string): Promise<any[]> {
    const project = await this.projectRepository.findOne({
      where: { projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // 1. Fetch from MongoDB primary document store
    try {
      const mongoMessages = await this.projectMessageMongoModel
        .find({ projectId: project.projectId, isVisible: true })
        .sort({ createdAt: 1 })
        .lean()
        .exec();

      if (mongoMessages && mongoMessages.length > 0) {
        return mongoMessages.map((m: any) => ({
          id: m._id?.toString() || m.id,
          projectId: m.projectId,
          senderId: m.senderId,
          senderName: m.senderName,
          messageType: m.messageType || 'general',
          content: m.content,
          createdAt: m.createdAt,
          status: 'seen',
        }));
      }
    } catch (err: any) {
      this.logger.error('Failed to query MongoDB messages', err.message);
    }

    // 2. Fallback to PostgreSQL if MongoDB collection was empty
    const pgMessages = await this.messageRepository.find({
      where: { projectId: project.id, isVisible: true },
      order: { createdAt: 'ASC' },
    });

    return pgMessages.map((m) => ({
      id: m.id,
      projectId: project.projectId,
      senderId: m.senderId,
      senderName: m.senderName,
      messageType: m.messageType,
      content: m.content,
      createdAt: m.createdAt,
      status: 'seen',
    }));
  }

  async findOne(messageId: number | string, userId?: string): Promise<any> {
    try {
      const mongoMsg = await this.projectMessageMongoModel.findById(messageId).lean();
      if (mongoMsg) return mongoMsg;
    } catch {}

    const numId = typeof messageId === 'number' ? messageId : parseInt(messageId);
    if (!isNaN(numId)) {
      return this.messageRepository.findOne({ where: { id: numId } });
    }
    throw new NotFoundException('Message not found');
  }

  async update(
    messageId: number | string,
    updateDto: UpdateMessageDto,
    updatedBy: string,
  ): Promise<any> {
    try {
      const updated = await this.projectMessageMongoModel.findByIdAndUpdate(
        messageId,
        {
          ...(updateDto.content && { content: updateDto.content }),
          ...(updateDto.messageType && { messageType: updateDto.messageType }),
        },
        { new: true },
      );
      if (updated) return updated;
    } catch {}

    const numId = typeof messageId === 'number' ? messageId : parseInt(messageId);
    if (!isNaN(numId)) {
      const message = await this.messageRepository.findOne({ where: { id: numId } });
      if (message) {
        if (updateDto.content !== undefined) message.content = updateDto.content;
        return this.messageRepository.save(message);
      }
    }
    throw new NotFoundException('Message not found');
  }

  async remove(messageId: number | string, userId: string): Promise<void> {
    try {
      await this.projectMessageMongoModel.findByIdAndUpdate(messageId, { isVisible: false });
    } catch {}

    const numId = typeof messageId === 'number' ? messageId : parseInt(messageId);
    if (!isNaN(numId)) {
      const message = await this.messageRepository.findOne({ where: { id: numId } });
      if (message) {
        message.isVisible = false;
        await this.messageRepository.save(message);
      }
    }
  }
}
