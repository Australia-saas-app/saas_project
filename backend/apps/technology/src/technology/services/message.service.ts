import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMessage, MessageType } from '../entities/project-message.entity';
import { ProjectParticipant, ParticipantRole } from '../entities/project-participant.entity';
import { Project } from '../entities/project.entity';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageDto } from '../dto/update-message.dto';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
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
  ): Promise<ProjectMessage> {
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

    const message = this.messageRepository.create({
      projectId: project.id,
      senderId,
      senderName: senderName || senderId,
      messageType: createDto.messageType || MessageType.GENERAL,
      content: createDto.content,
      isVisible: true,
    });

    const saved = await this.messageRepository.save(message);

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

    return saved;
  }

  async findAll(projectId: string, userId?: string): Promise<ProjectMessage[]> {
    const project = await this.projectRepository.findOne({
      where: { projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return this.messageRepository.find({
      where: { projectId: project.id, isVisible: true },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(messageId: number, userId?: string): Promise<ProjectMessage> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['project'],
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    return message;
  }

  async update(
    messageId: number,
    updateDto: UpdateMessageDto,
    updatedBy: string,
  ): Promise<ProjectMessage> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    if (message.senderId !== updatedBy) {
      throw new ForbiddenException('You cannot edit this message');
    }

    if (updateDto.content !== undefined) message.content = updateDto.content;
    if (updateDto.messageType !== undefined) message.messageType = updateDto.messageType;

    message.updatedAt = new Date();
    return this.messageRepository.save(message);
  }

  async remove(messageId: number, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You cannot delete this message');
    }

    message.isVisible = false;
    await this.messageRepository.save(message);
  }
}
