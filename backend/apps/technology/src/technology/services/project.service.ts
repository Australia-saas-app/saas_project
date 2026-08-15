import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import {
  Project,
  ProjectStatus,
  SubmissionStatus,
  PaymentStatus,
} from '../entities/project.entity';
import { ProjectParticipant, ParticipantRole } from '../entities/project-participant.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectQueryDto } from '../dto/project-query.dto';
import { ProjectProposal } from '../entities/project-proposal.entity';
import { ApplyProjectDto } from '../dto/apply-project.dto';
import { ProposalQueryDto } from '../dto/proposal-query.dto';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectParticipant)
    private readonly participantRepository: Repository<ProjectParticipant>,
    @InjectRepository(ProjectProposal)
    private readonly proposalRepository: Repository<ProjectProposal>,
  ) {}

  private async triggerNotification(payload: {
    userIds?: string[];
    userId?: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
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
          userIds: payload.userIds,
          role: payload.userId || payload.userIds?.length ? undefined : 'ADMIN',
          type: payload.type,
          title: payload.title,
          message: payload.message,
          priority: payload.priority || 'medium',
          data: { href: payload.href },
        }),
      }).catch(() => undefined);
    } catch {
      // ignore notification dispatch failure
    }
  }

  async create(createDto: CreateProjectDto, createdBy: string): Promise<Project> {
    const project = this.projectRepository.create({
      title: createDto.title,
      description: createDto.description,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      status: ProjectStatus.DRAFT,
      submissionStatus: SubmissionStatus.DRAFT,
      paymentStatus: PaymentStatus.NONE,
      paymentTerms: (createDto as any).paymentTerms || 'one_time',
      milestones: (createDto as any).milestones || [],
      price: createDto.price || 0,
      currency: createDto.currency || 'USD',
      category: createDto.category,
      subcategory: (createDto as any).subcategory,
      projectType: (createDto as any).projectType,
      paymentType: createDto.paymentType,
      skills: createDto.skills,
      preferredLanguages: createDto.preferredLanguages,
      clientEmail: createDto.clientEmail,
      clientPhone: createDto.clientPhone,
      attachmentFile: createDto.attachmentFile,
      clientId: createdBy,
      clientName: createDto.clientName || createdBy,
      createdBy,
      updatedBy: createdBy,
    });

    const savedProject = await this.projectRepository.save(project);

    await this.participantRepository.save(
      this.participantRepository.create({
        projectId: savedProject.id,
        userId: createdBy,
        userName: (createDto as any).clientName || createdBy,
        role: ParticipantRole.MEMBER,
        accountType: 'user',
      }),
    );

    return savedProject;
  }

  async findAll(
    query: ProjectQueryDto,
    userId?: string,
    options?: { publicOnly?: boolean; assignedTo?: string },
  ): Promise<any> {
    const { page = 1, limit = 10, search, status, createdBy, price, category, paymentType, skills } = query;
    const skip = (page - 1) * limit;

    const qb = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.participants', 'participant');

    if (options?.publicOnly) {
      qb.andWhere('project.submissionStatus = :ss', { ss: SubmissionStatus.ACTIVE });
    } else if (status) {
      qb.andWhere('project.status = :status', { status });
    }

    if (options?.assignedTo) {
      qb.andWhere('project.assignedBusinessId = :biz', { biz: options.assignedTo });
    }

    if (createdBy) qb.andWhere('project.createdBy = :createdBy', { createdBy });
    if (search) qb.andWhere('project.title LIKE :search', { search: `%${search}%` });
    if (price) qb.andWhere('project.price = :price', { price });
    if (category) qb.andWhere('project.category = :category', { category });
    if (paymentType) qb.andWhere('project.paymentType = :paymentType', { paymentType });

    if (skills) {
      const skillList = skills.split(',').map((s) => s.trim());
      skillList.forEach((skill, index) => {
        qb.andWhere(`project.skills LIKE :skill${index}`, { [`skill${index}`]: `%${skill}%` });
      });
    }

    // Client: only their own projects
    if (userId && !options?.publicOnly && !options?.assignedTo) {
      qb.andWhere('project.clientId = :userId', { userId });
    }

    const [projects, total] = await qb
      .orderBy('project.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { projects, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findOne(projectId: string, userId?: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { projectId },
      relations: ['participants', 'tasks', 'messages'],
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    return project;
  }

  async update(projectId: string, updateDto: UpdateProjectDto, updatedBy: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    if (updateDto.title !== undefined) project.title = updateDto.title;
    if (updateDto.description !== undefined) project.description = updateDto.description;
    if (updateDto.startDate !== undefined)
      project.startDate = updateDto.startDate ? new Date(updateDto.startDate) : null;
    if (updateDto.endDate !== undefined)
      project.endDate = updateDto.endDate ? new Date(updateDto.endDate) : null;
    if (updateDto.price !== undefined) project.price = updateDto.price;
    if (updateDto.currency !== undefined) project.currency = updateDto.currency;
    if (updateDto.category !== undefined) project.category = updateDto.category;
    if (updateDto.paymentType !== undefined) project.paymentType = updateDto.paymentType;
    if (updateDto.skills !== undefined) project.skills = updateDto.skills;

    project.updatedBy = updatedBy;
    return this.projectRepository.save(project);
  }

  async remove(projectId: string, userId: string): Promise<void> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    await this.projectRepository.remove(project);
  }

  // ─── LIFECYCLE ──────────────────────────────────────────────────────────────

  async submitProject(projectId: string, clientId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (project.clientId !== clientId) throw new ForbiddenException('Only the project owner can submit');
    if (project.submissionStatus !== SubmissionStatus.DRAFT)
      throw new BadRequestException('Project has already been submitted');

    project.submissionStatus = SubmissionStatus.SUBMITTED;
    project.updatedBy = clientId;
    const saved = await this.projectRepository.save(project);

    // Trigger notification to Admin
    this.triggerNotification({
      type: 'TECHNICAL_PROJECT_SUBMIT',
      title: 'New Technical Project Submission',
      message: `${project.clientName || 'Client'} submitted "${project.title}" for review.`,
      priority: 'high',
      href: '/technical',
    });

    return saved;
  }

  async adminApprove(
    projectId: string,
    adminId: string,
    data: {
      adminBudget: number;
      minBudget?: number;
      requirements?: string;
      conditions?: string;
      adminNotes?: string;
      commissionPercent?: number;
      paymentTerms?: string;
      milestones?: any[];
    },
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    if (![SubmissionStatus.SUBMITTED, SubmissionStatus.ADMIN_REVIEW].includes(project.submissionStatus))
      throw new BadRequestException('Project is not in a reviewable state');

    project.adminBudget = data.adminBudget;
    project.minBudget = data.minBudget ?? data.adminBudget;
    project.requirements = data.requirements ?? project.requirements;
    project.conditions = data.conditions ?? project.conditions;
    project.adminNotes = data.adminNotes ?? project.adminNotes;
    project.commissionPercent = data.commissionPercent ?? 10;
    if (data.paymentTerms) project.paymentTerms = data.paymentTerms;
    if (data.milestones) project.milestones = data.milestones;
    project.submissionStatus = SubmissionStatus.APPROVED;
    project.reviewedBy = adminId;
    project.reviewedAt = new Date();
    project.updatedBy = adminId;

    const saved = await this.projectRepository.save(project);

    // Notify Client that project has been quoted and approved
    if (project.clientId) {
      this.triggerNotification({
        userId: project.clientId,
        type: 'TECHNICAL_PROJECT_APPROVED',
        title: 'Project Approved — Ready for Payment',
        message: `Admin approved "${project.title}" with a budget of ${project.currency || 'USD'} ${data.adminBudget}. Please pay to publish.`,
        priority: 'high',
        href: '/user/technical',
      });
    }

    return saved;
  }

  async adminReject(projectId: string, adminId: string, reason?: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    project.submissionStatus = SubmissionStatus.REJECTED;
    project.adminNotes = reason ?? project.adminNotes;
    project.reviewedBy = adminId;
    project.reviewedAt = new Date();
    project.updatedBy = adminId;
    const saved = await this.projectRepository.save(project);

    if (project.clientId) {
      this.triggerNotification({
        userId: project.clientId,
        type: 'TECHNICAL_PROJECT_REJECTED',
        title: 'Project Update',
        message: `Your project "${project.title}" was not approved: ${reason || 'Does not meet requirements'}.`,
        priority: 'high',
        href: '/user/technical',
      });
    }

    return saved;
  }

  async payProject(projectId: string, clientId: string, milestoneId?: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (project.clientId !== clientId) throw new ForbiddenException('Not your project');
    if (project.submissionStatus !== SubmissionStatus.APPROVED && project.submissionStatus !== SubmissionStatus.IN_PROGRESS)
      throw new BadRequestException('Project is not in a payable state');

    let amount = Number(project.adminBudget || project.price);

    // If milestone-based payment
    if (milestoneId && project.milestones && Array.isArray(project.milestones)) {
      const ms = project.milestones.find((m) => m.id === milestoneId);
      if (ms) {
        amount = Number(ms.amount);
        ms.status = 'funded';
      }
    }

    if (!amount || amount <= 0) throw new BadRequestException('No valid budget amount');

    const walletUrl =
      process.env.WALLET_SERVICE_URL || 'http://saas-backend-wallet:3015/wallet-service';
    const walletRes = await fetch(`${walletUrl}/internal/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: clientId,
        amount,
        description: `Payment for project: ${project.title} (${project.projectId})`,
        reference: project.projectId,
      }),
    }).catch(() => null);

    if (!walletRes || !walletRes.ok) {
      const err = (await walletRes?.json().catch(() => ({}))) as any;
      throw new BadRequestException(err?.message || 'Payment failed — please check your wallet balance');
    }

    project.submissionStatus = SubmissionStatus.ACTIVE;
    project.status = ProjectStatus.ACTIVE;
    project.paymentStatus = PaymentStatus.PAID;
    project.paidAt = new Date();
    project.updatedBy = clientId;
    const saved = await this.projectRepository.save(project);

    // Notify Business network that a new project is public
    this.triggerNotification({
      type: 'TECHNICAL_PROJECT_FUNDED',
      title: 'New Funded Project Available',
      message: `"${project.title}" has been funded (${project.currency || 'USD'} ${amount}) and is open for acceptance!`,
      priority: 'high',
      href: '/business/technical',
    });

    return saved;
  }

  async acceptProject(projectId: string, businessId: string, businessName: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (project.submissionStatus !== SubmissionStatus.ACTIVE)
      throw new BadRequestException('Project is not available for acceptance');
    if (project.assignedBusinessId) throw new ConflictException('Already accepted by another business');

    project.assignedBusinessId = businessId;
    project.assignedBusinessName = businessName;
    project.submissionStatus = SubmissionStatus.IN_PROGRESS;
    project.status = ProjectStatus.IN_PROGRESS;
    project.acceptedAt = new Date();
    project.updatedBy = businessId;

    const existing = await this.participantRepository.findOne({
      where: { projectId: project.id, userId: businessId },
    });
    if (!existing) {
      await this.participantRepository.save(
        this.participantRepository.create({
          projectId: project.id,
          userId: businessId,
          userName: businessName,
          role: ParticipantRole.MEMBER,
          accountType: 'business',
        }),
      );
    }

    const saved = await this.projectRepository.save(project);

    // Notify Client
    if (project.clientId) {
      this.triggerNotification({
        userId: project.clientId,
        type: 'TECHNICAL_PROJECT_ACCEPTED',
        title: 'Business Started Work',
        message: `${businessName} has accepted "${project.title}" and is now working on it.`,
        priority: 'high',
        href: '/user/technical',
      });
    }

    return saved;
  }

  async markComplete(
    projectId: string,
    businessId: string,
    data: { deliverableUrls?: string[]; deliverableFiles?: any[]; completionNotes?: string },
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (project.assignedBusinessId !== businessId) throw new ForbiddenException('Not your project');
    if (project.submissionStatus !== SubmissionStatus.IN_PROGRESS && project.submissionStatus !== SubmissionStatus.REVISION)
      throw new BadRequestException('Project is not in progress or revision');

    project.submissionStatus = SubmissionStatus.COMPLETED;
    project.status = ProjectStatus.COMPLETED;
    project.deliverableUrls = data.deliverableUrls ?? [];
    project.deliverableFiles = data.deliverableFiles ?? [];
    project.completionNotes = data.completionNotes ?? '';
    project.completedAt = new Date();
    project.updatedBy = businessId;
    const saved = await this.projectRepository.save(project);

    // Notify Client & Admin
    if (project.clientId) {
      this.triggerNotification({
        userId: project.clientId,
        type: 'TECHNICAL_PROJECT_COMPLETED',
        title: 'Project Deliverables Ready for Review',
        message: `${project.assignedBusinessName || 'Business'} submitted deliverables for "${project.title}". Please review and accept.`,
        priority: 'high',
        href: '/user/technical',
      });
    }

    return saved;
  }

  async reviewAccept(projectId: string, reviewerId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (project.submissionStatus !== SubmissionStatus.COMPLETED)
      throw new BadRequestException('Project must be completed first');

    project.submissionStatus = SubmissionStatus.ACCEPTED;
    project.updatedBy = reviewerId;
    const saved = await this.projectRepository.save(project);
    await this.releasePayment(saved);

    // Notify Business
    if (project.assignedBusinessId) {
      this.triggerNotification({
        userId: project.assignedBusinessId,
        type: 'TECHNICAL_PROJECT_PAID',
        title: 'Project Accepted & Payment Released',
        message: `Your work on "${project.title}" was accepted. Payout has been transferred to your wallet!`,
        priority: 'high',
        href: '/business/technical',
      });
    }

    return saved;
  }

  async requestRevision(projectId: string, reviewerId: string, reason: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (project.submissionStatus !== SubmissionStatus.COMPLETED)
      throw new BadRequestException('Can only request revision on completed projects');

    project.submissionStatus = SubmissionStatus.REVISION;
    project.adminNotes = reason;
    project.updatedBy = reviewerId;
    const saved = await this.projectRepository.save(project);

    // Notify Business
    if (project.assignedBusinessId) {
      this.triggerNotification({
        userId: project.assignedBusinessId,
        type: 'TECHNICAL_PROJECT_REVISION',
        title: 'Revision Requested',
        message: `Client requested revision on "${project.title}": ${reason}`,
        priority: 'high',
        href: '/business/technical',
      });
    }

    return saved;
  }

  private async releasePayment(project: Project): Promise<void> {
    const total = Number(project.adminBudget || project.price);
    const commissionPct = Number(project.commissionPercent ?? 10);
    const commission = parseFloat(((total * commissionPct) / 100).toFixed(2));
    const businessPayout = parseFloat((total - commission).toFixed(2));

    const walletUrl =
      process.env.WALLET_SERVICE_URL || 'http://saas-backend-wallet:3015/wallet-service';

    if (project.assignedBusinessId && businessPayout > 0) {
      await fetch(`${walletUrl}/internal/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: project.assignedBusinessId,
          amount: businessPayout,
          description: `Payment release for project: ${project.title} (${project.projectId})`,
          reference: project.projectId,
        }),
      }).catch((e) => this.logger.error('Failed to credit business wallet', e));
    }

    this.logger.log(
      `Payment released for ${project.projectId}: total=${total}, commission=${commission}, business=${businessPayout}`,
    );

    project.paymentStatus = PaymentStatus.RELEASED;
    project.paymentReleasedAt = new Date();
    await this.projectRepository.save(project);
  }

  // ─── PROPOSALS / PARTICIPANTS ────────────────────────────────────────────────

  async addParticipant(
    projectId: string,
    userId: string,
    userName: string,
    role: ParticipantRole,
    invitedBy: string,
    accountType: string,
  ): Promise<ProjectParticipant> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const existing = await this.participantRepository.findOne({ where: { projectId: project.id, userId } });
    if (existing) throw new ConflictException('User already a participant');

    return this.participantRepository.save(
      this.participantRepository.create({ projectId: project.id, userId, userName, role, accountType, invitedBy }),
    );
  }

  async updateParticipantRole(
    projectId: string,
    participantUserId: string,
    newRole: ParticipantRole,
    updatedBy: string,
  ): Promise<ProjectParticipant> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const participant = await this.participantRepository.findOne({
      where: { projectId: project.id, userId: participantUserId },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    participant.role = newRole;
    return this.participantRepository.save(participant);
  }

  async applyForProject(projectId: string, applyDto: ApplyProjectDto, userId: string): Promise<ProjectProposal> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const existing = await this.proposalRepository.findOne({ where: { projectId: project.id, userId } });
    if (existing) throw new ConflictException('Already submitted a proposal');

    return this.proposalRepository.save(
      this.proposalRepository.create({
        projectId: project.id,
        userId,
        proposal: applyDto.proposal,
        price: applyDto.price,
        currency: applyDto.currency,
        timeline: applyDto.timeline,
        paymentType: applyDto.paymentType,
      }),
    );
  }

  async findProposals(projectId: string, query: ProposalQueryDto): Promise<any> {
    const { page = 1, limit = 10, timeline, paymentType } = query;
    const skip = (page - 1) * limit;

    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const qb = this.proposalRepository
      .createQueryBuilder('proposal')
      .where('proposal.projectId = :projectId', { projectId: project.id });

    if (timeline) qb.andWhere('proposal.timeline LIKE :timeline', { timeline: `%${timeline}%` });
    if (paymentType) qb.andWhere('proposal.paymentType = :paymentType', { paymentType });

    const [proposals, total] = await qb.orderBy('proposal.createdAt', 'DESC').skip(skip).take(limit).getManyAndCount();
    return { proposals, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async selectProposal(projectId: string, proposalId: string, adminId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId }, relations: ['participants'] });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const proposal = await this.proposalRepository.findOne({ where: { proposalId, projectId: project.id } });
    if (!proposal) throw new NotFoundException(`Proposal ${proposalId} not found`);

    project.acceptedProposalId = proposal.id;
    project.price = proposal.price;
    project.currency = proposal.currency;
    project.paymentType = proposal.paymentType;
    project.status = ProjectStatus.ACTIVE;
    const saved = await this.projectRepository.save(project);

    const existingP = project.participants.find((p) => p.userId === proposal.userId);
    if (!existingP) {
      await this.participantRepository.save(
        this.participantRepository.create({
          projectId: project.id,
          userId: proposal.userId,
          userName: proposal.userId,
          role: ParticipantRole.MEMBER,
          accountType: 'user',
          invitedBy: adminId,
        }),
      );
    }
    return saved;
  }
}
