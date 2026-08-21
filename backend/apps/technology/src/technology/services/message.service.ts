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
    const numericId = parseInt(projectId, 10);
    const project = await this.projectRepository
      .findOne({
        where: isNaN(numericId) ? [{ projectId }] : [{ projectId }, { id: numericId }],
      })
      .catch(() => null);

    const resolvedProjectId = project?.projectId || projectId;
    const projectTitle = createDto.projectTitle || project?.title || 'Project Application';

    // 1. Save directly into MongoDB (Mongoose Collection: 'project_messages')
    let mongoSavedDoc: any = null;
    try {
      mongoSavedDoc = await this.projectMessageMongoModel.create({
        projectId: resolvedProjectId,
        senderId,
        senderName: createDto.senderName || senderName || senderId,
        messageType: createDto.messageType || 'general',
        content: createDto.content,
        isVisible: true,
        status: 'delivered',
        metadata: {
          projectNumericId: project?.id,
          projectTitle,
          senderName: createDto.senderName || senderName || senderId,
          senderEmail: createDto.senderEmail || '',
          recipientName: createDto.recipientName || '',
          recipientEmail: createDto.recipientEmail || '',
          recipientBusiness: createDto.recipientBusiness || '',
          recipientUserId: createDto.recipientUserId || '',
          threadId: createDto.threadId || projectId,
          subject: createDto.subject || `Subject: Application for ${projectTitle}`,
        },
      });
    } catch (e: any) {
      this.logger.error('Failed to save message to MongoDB', e.message);
    }

    // 2. Also save to PostgreSQL if project exists
    if (project) {
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
    }

    // 3. Identify recipient to notify
    let recipientId: string | null = null;
    if (project?.clientId && project.clientId !== senderId) {
      recipientId = project.clientId;
    } else if (project?.assignedBusinessId && project.assignedBusinessId !== senderId) {
      recipientId = project.assignedBusinessId;
    }

    if (recipientId) {
      this.triggerNotification({
        userId: recipientId,
        type: 'PROJECT_CHAT_MESSAGE',
        title: `New Message on "${projectTitle}"`,
        message: `${senderName || 'Team member'}: ${createDto.content.slice(0, 80)}`,
        href: `/technical`,
      });
    }

    return mongoSavedDoc
      ? {
          id: mongoSavedDoc._id?.toString() || mongoSavedDoc.id,
          projectId: resolvedProjectId,
          senderId: mongoSavedDoc.senderId,
          senderName: mongoSavedDoc.senderName,
          messageType: mongoSavedDoc.messageType,
          content: mongoSavedDoc.content,
          createdAt: mongoSavedDoc.createdAt,
          status: 'delivered',
        }
      : {
          id: Date.now(),
          projectId: resolvedProjectId,
          senderId,
          senderName,
          content: createDto.content,
          createdAt: new Date().toISOString(),
        };
  }

  async findAll(projectId: string, userId?: string): Promise<any[]> {
    const numericId = parseInt(projectId, 10);
    const project = await this.projectRepository
      .findOne({
        where: isNaN(numericId) ? [{ projectId }] : [{ projectId }, { id: numericId }],
      })
      .catch(() => null);

    const resolvedProjectId = project?.projectId || projectId;

    // 1. Fetch from MongoDB primary document store
    try {
      const mongoMessages = await this.projectMessageMongoModel
        .find({
          $or: [
            { projectId: resolvedProjectId },
            { projectId },
            { 'metadata.threadId': projectId },
            { 'metadata.threadId': resolvedProjectId },
          ],
          isVisible: true,
        })
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

    // 2. Fallback to PostgreSQL if MongoDB collection was empty and project exists
    if (project) {
      try {
        const pgMessages = await this.messageRepository.find({
          where: { projectId: project.id, isVisible: true },
          order: { createdAt: 'ASC' },
        });

        if (pgMessages.length > 0) {
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
      } catch {}
    }

    return [];
  }

  async findUserThreads(userId: string, email: string): Promise<any[]> {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedUserId = (userId || '').trim().toLowerCase();
      const userIdentifiers = [normalizedEmail, normalizedUserId].filter(Boolean);

      if (userIdentifiers.length === 0) {
        return [];
      }

      // Match ANY message where current user is sender OR recipient (by email or userId)
      const userMatchConditions: any[] = [];
      userIdentifiers.forEach((id) => {
        userMatchConditions.push(
          { senderId: id },
          { senderId: { $regex: new RegExp(`^${id}$`, 'i') } },
          { 'metadata.senderEmail': { $regex: new RegExp(`^${id}$`, 'i') } },
          { 'metadata.recipientEmail': { $regex: new RegExp(`^${id}$`, 'i') } },
          { 'metadata.recipientUserId': id },
          { 'metadata.recipientUserId': { $regex: new RegExp(`^${id}$`, 'i') } },
          { 'metadata.recipientId': id },
          { 'metadata.senderId': id },
        );
      });

      // Also include any projects/participants the user is linked with
      try {
        const orConditions: any[] = [];
        if (normalizedUserId) {
          orConditions.push(
            { createdBy: normalizedUserId },
            { clientId: normalizedUserId },
            { assignedBusinessId: normalizedUserId },
          );
        }
        if (normalizedEmail) {
          orConditions.push(
            { clientEmail: normalizedEmail },
          );
        }

        if (orConditions.length > 0) {
          const userProjects = await this.projectRepository.find({ where: orConditions });
          userProjects.forEach((p) => {
            if (p.projectId) {
              userMatchConditions.push(
                { projectId: p.projectId },
                { 'metadata.threadId': { $regex: new RegExp(p.projectId, 'i') } },
              );
            }
            if (p.id) {
              userMatchConditions.push(
                { projectId: String(p.id) },
                { 'metadata.projectNumericId': p.id },
              );
            }
          });
        }

        if (normalizedUserId) {
          const userParticipants = await this.participantRepository.find({ where: { userId: normalizedUserId } });
          userParticipants.forEach((part) => {
            if (part.projectId) {
              userMatchConditions.push(
                { projectId: String(part.projectId) },
                { 'metadata.projectNumericId': part.projectId },
              );
            }
          });
        }
      } catch (e) {}

      const query: any = {
        isVisible: true,
        $or: userMatchConditions,
      };

      // Filter out messages that this user specifically deleted
      if (userIdentifiers.length > 0) {
        query['metadata.deletedBy'] = { $nin: userIdentifiers };
      }

      const rawMessages = await this.projectMessageMongoModel
        .find(query)
        .sort({ createdAt: 1 })
        .lean()
        .exec();

      if (!rawMessages || rawMessages.length === 0) {
        return [];
      }

      return this.groupMessagesIntoThreads(rawMessages, normalizedUserId, normalizedEmail);
    } catch (e: any) {
      this.logger.error('Failed to find user threads from MongoDB', e.message);
      return [];
    }
  }

  async deleteThreadForUser(threadId: string, userId: string, email: string): Promise<any> {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedUserId = (userId || '').trim().toLowerCase();
      const identifiers = [normalizedEmail, normalizedUserId].filter(Boolean);

      if (identifiers.length === 0) return { success: false, message: 'Invalid user' };

      await this.projectMessageMongoModel.updateMany(
        {
          $or: [
            { 'metadata.threadId': threadId },
            { projectId: threadId },
          ],
        },
        {
          $addToSet: { 'metadata.deletedBy': { $each: identifiers } },
        }
      ).exec();

      return { success: true, message: 'Thread deleted' };
    } catch (e: any) {
      this.logger.error('Failed to delete thread in MongoDB', e.message);
      return { success: false, message: e.message };
    }
  }

  async markThreadReadForUser(threadId: string, userId: string, email: string): Promise<any> {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedUserId = (userId || '').trim().toLowerCase();
      const identifiers = [normalizedEmail, normalizedUserId].filter(Boolean);

      if (identifiers.length === 0) return { success: false, message: 'Invalid user' };

      await this.projectMessageMongoModel.updateMany(
        {
          $or: [
            { 'metadata.threadId': threadId },
            { projectId: threadId },
          ],
        },
        {
          $addToSet: { 'metadata.readBy': { $each: identifiers } },
          status: 'seen',
        }
      ).exec();

      return { success: true, message: 'Thread marked as read' };
    } catch (e: any) {
      this.logger.error('Failed to mark thread read in MongoDB', e.message);
      return { success: false, message: e.message };
    }
  }

  private groupMessagesIntoThreads(messages: any[], userId: string, email: string): any[] {
    const threadMap = new Map<string, any>();

    for (const m of messages) {
      const threadId = m.metadata?.threadId || m.projectId;
      if (!threadId) continue;

      const senderEmail = (m.metadata?.senderEmail || '').toLowerCase();
      const isMe =
        (email && senderEmail === email) ||
        (userId && String(m.senderId).toLowerCase() === userId);

      const readByList: string[] = (m.metadata?.readBy || []).map((x: string) => String(x).toLowerCase());
      const hasRead = (email && readByList.includes(email.toLowerCase())) ||
                      (userId && readByList.includes(userId.toLowerCase()));

      const msgIsUnread = !isMe && !hasRead;

      const formattedMsg = {
        id: m._id?.toString() || m.id,
        from: isMe ? ('me' as const) : ('them' as const),
        fromName: m.senderName || m.metadata?.senderName || 'Team Member',
        fromEmail: m.metadata?.senderEmail || '',
        body: m.content || '',
        sentAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
      };

      const otherPartyName = isMe
        ? (m.metadata?.recipientName || 'Business Partner')
        : (m.metadata?.senderName || m.senderName || 'Client');

      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, {
          id: threadId,
          projectId: m.projectId,
          project: m.metadata?.projectTitle || 'Project Application',
          subject: m.metadata?.subject || `Subject: Application for ${m.metadata?.projectTitle || 'Project'}`,
          participant: otherPartyName,
          senderName: m.metadata?.senderName || m.senderName || '',
          senderEmail: m.metadata?.senderEmail || '',
          recipientName: m.metadata?.recipientName || '',
          recipientEmail: m.metadata?.recipientEmail || '',
          recipientBusiness: m.metadata?.recipientBusiness || '',
          recipientUserId: m.metadata?.recipientUserId || '',
          unread: msgIsUnread,
          updatedAt: formattedMsg.sentAt,
          folder: 'inbox',
          messages: [formattedMsg],
        });
      } else {
        const existing = threadMap.get(threadId);
        existing.messages.push(formattedMsg);
        existing.updatedAt = formattedMsg.sentAt;
        existing.unread = msgIsUnread;
        if (m.metadata?.recipientName && (!existing.recipientName || existing.recipientName === 'Business Partner')) {
          existing.recipientName = m.metadata.recipientName;
        }
        if (m.metadata?.recipientBusiness && !existing.recipientBusiness) {
          existing.recipientBusiness = m.metadata.recipientBusiness;
        }
        if (m.metadata?.senderName && (!existing.senderName || existing.senderName === 'Client')) {
          existing.senderName = m.metadata.senderName;
        }
        if (m.metadata?.senderEmail && !existing.senderEmail) {
          existing.senderEmail = m.metadata.senderEmail;
        }
        if (m.metadata?.recipientEmail && !existing.recipientEmail) {
          existing.recipientEmail = m.metadata.recipientEmail;
        }
      }
    }

    return Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
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
