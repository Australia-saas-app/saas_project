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
    userId?: string;
    userIds?: string[];
    role?: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
    href?: string;
  }) {
    const urls = [
      process.env.NOTIFICATION_SERVICE_URL,
      'http://saas-backend-notification:3014/notification-service/internal/notifications',
      'http://saas-backend-notification:3014/internal/notifications',
      'http://notification-service:3014/notification-service/internal/notifications',
      'http://notification-service:3014/internal/notifications',
      'http://localhost:3014/notification-service/internal/notifications',
      'http://localhost:3014/internal/notifications',
    ].filter(Boolean) as string[];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: payload.userId,
            userIds: payload.userIds,
            role: payload.role || (payload.userId || payload.userIds?.length ? undefined : 'ADMIN'),
            type: payload.type,
            title: payload.title,
            message: payload.message,
            priority: payload.priority || 'high',
            data: { href: payload.href || '/admin/technical' },
          }),
        });
        if (res.ok) break;
      } catch {
        // continue fallback
      }
    }
  }

  private async triggerActivityLog(payload: {
    action: string;
    resource: string;
    userId: string;
    userName?: string;
    email?: string;
  }) {
    const urls = [
      process.env.USER_PROFILE_SERVICE_URL ? `${process.env.USER_PROFILE_SERVICE_URL}/activity` : null,
      'http://saas-backend-user-profile:3005/user-profile-service/activity',
      'http://saas-backend-user-profile:3005/activity',
      'http://user-profile-service:3005/user-profile-service/activity',
      'http://user-profile-service:3005/activity',
      'http://localhost:3005/user-profile-service/activity',
      'http://localhost:3005/activity',
    ].filter(Boolean) as string[];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: payload.action,
            resource: payload.resource,
            details: {
              name: payload.userName || 'User',
              email: payload.email || '',
              userId: payload.userId,
            },
          }),
        });
        if (res.ok) break;
      } catch {
        // continue fallback
      }
    }
  }

  async create(createDto: CreateProjectDto, createdBy: string): Promise<Project> {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const generatedProjectId = (createDto as any).projectId || `PRJ-${hh}${mm}${ss}`;

    const project = this.projectRepository.create({
      projectId: generatedProjectId,
      title: createDto.title,
      description: createDto.description,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      status: ProjectStatus.DRAFT,
      submissionStatus: SubmissionStatus.DRAFT,
      paymentStatus: PaymentStatus.NONE,
      paymentTerms: (createDto as any).paymentTerms || 'one_time',
      milestones: (createDto as any).milestones || [],
      price: createDto.price || (createDto as any).budgetAmount || (createDto as any).adminBudget || 0,
      adminBudget: (createDto as any).adminBudget || createDto.price || (createDto as any).budgetAmount || 0,
      minBudget: (createDto as any).minBudget || createDto.price || 0,
      commissionPercent: Number((createDto as any).commissionPercent ?? 10),
      commissionAmount: 0,
      totalAmount: Number(createDto.price || (createDto as any).adminBudget || 0),
      paidAmount: 0,
      dueAmount: Number(createDto.price || (createDto as any).adminBudget || 0),
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

    // Trigger Admin Notification (Single official notification)
    this.triggerNotification({
      type: 'TECHNICAL_PROJECT_SUBMIT',
      title: 'New Technical Project Submission',
      message: `${savedProject.clientName || 'Client'} submitted "${savedProject.title}" (${savedProject.projectId}) for review.`,
      priority: 'high',
      href: '/technical',
    });

    return savedProject;
  }

  async findAll(
    query: ProjectQueryDto,
    userId?: string,
    options?: { publicOnly?: boolean; assignedTo?: string },
  ): Promise<any> {
    const { page = 1, limit = 100, search, status, createdBy, price, category, paymentType, skills } = query;
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

    // Client: only their own projects (match either clientId or createdBy)
    if (userId && !options?.publicOnly && !options?.assignedTo) {
      qb.andWhere('(project.clientId = :userId OR project.createdBy = :userId)', { userId });
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
    const numId = !isNaN(Number(projectId)) ? Number(projectId) : -1;
    let project = await this.projectRepository.findOne({
      where: [{ projectId }, ...(numId > 0 ? [{ id: numId }] : [])],
      relations: ['participants', 'proposals'],
    });

    if (!project) {
      // Idempotent delete: if already removed from database, exit cleanly without error
      return;
    }

    const isPaid =
      project.paymentStatus === PaymentStatus.PAID ||
      project.paymentStatus === PaymentStatus.RELEASED ||
      project.submissionStatus === SubmissionStatus.ACTIVE ||
      project.submissionStatus === SubmissionStatus.IN_PROGRESS;

    if (isPaid) {
      throw new BadRequestException('Funded and active projects cannot be deleted.');
    }

    const projectTitle = project.title;
    const projectCode = project.projectId;
    const projectBudget = project.adminBudget || project.price || 0;

    // Clean up related proposals and participants
    if (project.participants?.length) {
      try {
        await this.participantRepository.remove(project.participants);
      } catch {}
    }

    if (project.proposals?.length) {
      try {
        await this.proposalRepository.remove(project.proposals);
      } catch {}
    }

    // Delete project completely from database
    await this.projectRepository.remove(project);

    // Record Activity Log
    this.triggerActivityLog({
      action: 'PROJECT_DELETED',
      resource: `Project Deleted: "${projectTitle}" (${projectCode}) - Submitted with budget $${projectBudget}`,
      userId,
    });
  }

  // ─── LIFECYCLE ──────────────────────────────────────────────────────────────

  async submitProject(projectId: string, clientId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
    if (project.clientId !== clientId) throw new ForbiddenException('Only the project owner can submit');
    if (project.submissionStatus !== SubmissionStatus.DRAFT)
      throw new BadRequestException('Project has already been submitted');

    const basePrice = Number(project.price || 0);
    const commPercent = Number(project.commissionPercent ?? 10);
    const commAmount = 0; // Applied upon admin approval
    const totalAmt = basePrice;

    project.commissionPercent = commPercent;
    project.commissionAmount = commAmount;
    project.totalAmount = totalAmt;
    project.dueAmount = Number(Math.max(0, totalAmt - Number(project.paidAmount || 0)).toFixed(2));
    project.submissionStatus = SubmissionStatus.SUBMITTED;
    project.updatedBy = clientId;
    const saved = await this.projectRepository.save(project);

    // Trigger notification to Admin
    this.triggerNotification({
      type: 'TECHNICAL_PROJECT_SUBMIT',
      title: 'New Technical Project Submission',
      message: `${project.clientName || 'Client'} submitted "${project.title}" (${project.projectId}) for review.`,
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

    const baseBudget = Number(data.adminBudget);
    const commPercent = Number(data.commissionPercent ?? project.commissionPercent ?? 10);
    const commAmount = Number(((baseBudget * commPercent) / 100).toFixed(2));
    const totalAmt = Number((baseBudget + commAmount).toFixed(2));

    project.adminBudget = baseBudget;
    project.minBudget = data.minBudget ?? baseBudget;
    project.requirements = data.requirements ?? project.requirements;
    project.conditions = data.conditions ?? project.conditions;
    project.adminNotes = data.adminNotes ?? project.adminNotes;
    project.commissionPercent = commPercent;
    project.commissionAmount = commAmount;
    project.totalAmount = totalAmt;
    project.dueAmount = Number(Math.max(0, totalAmt - Number(project.paidAmount || 0)).toFixed(2));
    if (data.paymentTerms) project.paymentTerms = data.paymentTerms;
    if (data.milestones) project.milestones = data.milestones;
    project.submissionStatus = SubmissionStatus.APPROVED;
    project.reviewedBy = adminId;
    project.reviewedAt = new Date();
    project.updatedBy = adminId;

    const saved = await this.projectRepository.save(project);

    // Notify Client that project has been quoted and approved
    const targetUserId = project.clientId || project.createdBy;
    if (targetUserId) {
      this.triggerNotification({
        userId: targetUserId,
        type: 'TECHNICAL_PROJECT_APPROVED',
        title: 'Project Approved — Ready for Payment',
        message: `Admin approved "${project.title}" with a budget of ${project.currency || 'USD'} ${data.adminBudget}. Please pay to publish.`,
        priority: 'high',
        href: '/dashboard/user/technical',
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

    const targetUserId = project.clientId || project.createdBy;
    if (targetUserId) {
      this.triggerNotification({
        userId: targetUserId,
        type: 'TECHNICAL_PROJECT_REJECTED',
        title: 'Project Review Update',
        message: `Your project "${project.title}" was not approved: ${reason || 'Does not meet requirements'}.`,
        priority: 'high',
        href: '/dashboard/user/technical',
      });
    }

    return saved;
  }

  async payProject(projectId: string, clientId?: string, milestoneId?: string): Promise<Project> {
    let project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project && !isNaN(Number(projectId))) {
      project = await this.projectRepository.findOne({ where: { id: Number(projectId) } });
    }
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const baseBudget = Number(project.adminBudget || project.price || 0);
    const commPercent = Number(project.commissionPercent ?? 10);
    let paymentToDeduct = 0;

    // If milestone-based payment
    if (milestoneId && project.milestones && Array.isArray(project.milestones)) {
      const ms = project.milestones.find((m) => m.id === milestoneId);
      if (ms) {
        const msAmount = Number(ms.amount);
        const msComm = Number(((msAmount * commPercent) / 100).toFixed(2));
        paymentToDeduct = Number((msAmount + msComm).toFixed(2));
        ms.status = 'funded';
      }
    } else {
      const commAmount = Number(((baseBudget * commPercent) / 100).toFixed(2));
      paymentToDeduct = Number((baseBudget + commAmount).toFixed(2));
    }

    if (!paymentToDeduct || paymentToDeduct <= 0) {
      paymentToDeduct = Number(project.totalAmount || 100);
    }

    const effectiveUserId = clientId || project.clientId || project.createdBy || 'user';
    const walletUrls = [
      process.env.WALLET_SERVICE_URL ? `${process.env.WALLET_SERVICE_URL}/internal/deduct` : '',
      'http://saas-backend-sso:3001/sso/wallet/internal/deduct',
      'http://saas-backend-sso:3001/wallet/internal/deduct',
      'http://localhost:3001/sso/wallet/internal/deduct',
      'http://saas-backend-wallet:3015/wallet-service/internal/deduct',
      'http://saas-backend-wallet:3015/internal/deduct',
      'http://wallet-service:3015/wallet-service/internal/deduct',
      'http://wallet-service:3015/internal/deduct',
      'http://localhost:3015/wallet-service/internal/deduct',
    ].filter(Boolean);

    for (const url of walletUrls) {
      try {
        const walletRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: effectiveUserId,
            amount: paymentToDeduct,
            description: `Payment for project: ${project.title} (${project.projectId})`,
            reference: project.projectId,
          }),
        });
        if (walletRes.ok) break;
      } catch {}
    }

    // Credit payment to Admin Platform Escrow Wallet in DB
    const adminCreditUrls = [
      process.env.WALLET_SERVICE_URL ? `${process.env.WALLET_SERVICE_URL}/internal/credit` : '',
      'http://saas-backend-sso:3001/sso/wallet/internal/credit',
      'http://saas-backend-sso:3001/wallet/internal/credit',
      'http://localhost:3001/sso/wallet/internal/credit',
      'http://saas-backend-wallet:3015/wallet-service/internal/credit',
      'http://saas-backend-wallet:3015/internal/credit',
      'http://wallet-service:3015/wallet-service/internal/credit',
      'http://wallet-service:3015/internal/credit',
      'http://localhost:3015/wallet-service/internal/credit',
    ].filter(Boolean);

    for (const url of adminCreditUrls) {
      try {
        const creditRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'admin',
            amount: paymentToDeduct,
            description: `Escrow received from ${effectiveUserId} for: ${project.title} (${project.projectId})`,
            reference: project.projectId,
          }),
        });
        if (creditRes.ok) break;
      } catch {}
    }

    // Update project financial fields in database
    project.paidAmount = Number((Number(project.paidAmount || 0) + paymentToDeduct).toFixed(2));
    const commAmount = Number(((baseBudget * commPercent) / 100).toFixed(2));
    project.commissionAmount = commAmount;
    project.totalAmount = Number((baseBudget + commAmount).toFixed(2));
    project.dueAmount = Number(Math.max(0, project.totalAmount - project.paidAmount).toFixed(2));
    project.paymentStatus = project.dueAmount <= 0 ? PaymentStatus.PAID : PaymentStatus.PENDING;
    project.submissionStatus = SubmissionStatus.ACTIVE;
    project.status = ProjectStatus.ACTIVE;
    project.paidAt = new Date();
    project.updatedBy = effectiveUserId;
    const saved = await this.projectRepository.save(project);

    // Notify Admin that client has paid escrow and project is active
    this.triggerNotification({
      role: 'ADMIN',
      type: 'TECHNICAL_PROJECT_PAID',
      title: 'Project Payment Approved & Escrow Funded',
      message: `Client paid $${paymentToDeduct} into escrow for "${project.title}" (${project.projectId}). Project is now Active for Public.`,
      priority: 'high',
      href: '/technical',
    });

    // Notify Business network that a new project is public
    this.triggerNotification({
      role: 'BUSINESS',
      type: 'TECHNICAL_PROJECT_FUNDED',
      title: 'New Funded Project Available',
      message: `"${project.title}" has been funded (${project.currency || 'USD'} ${paymentToDeduct}) and is open for acceptance!`,
      priority: 'high',
      href: '/business/technical',
    });

    // Trigger Activity Log
    this.triggerActivityLog({
      action: 'PROJECT_PAID',
      resource: `Paid $${paymentToDeduct} USD for "${project.title}" (${project.projectId})`,
      userId: clientId,
    });

    return saved;
  }

  async assignApplicant(
    projectId: string,
    clientId: string,
    applicant: {
      businessId: string;
      businessName: string;
      businessUserId?: string;
      businessEmail?: string;
      proposalId?: string;
    },
  ): Promise<Project> {
    let project = await this.projectRepository.findOne({ where: { projectId } });
    if (!project && !isNaN(Number(projectId))) {
      project = await this.projectRepository.findOne({ where: { id: Number(projectId) } });
    }
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const effectiveBusinessId = applicant.businessUserId || applicant.businessId;
    project.assignedBusinessId = effectiveBusinessId;
    project.assignedBusinessName = applicant.businessName || effectiveBusinessId;
    if (applicant.businessEmail) {
      project.assignedBusinessEmail = applicant.businessEmail;
    }
    project.submissionStatus = SubmissionStatus.IN_PROGRESS;
    project.status = ProjectStatus.IN_PROGRESS;
    project.acceptedAt = new Date();
    project.updatedBy = clientId;

    if (applicant.proposalId) {
      const proposal = await this.proposalRepository.findOne({
        where: { proposalId: applicant.proposalId, projectId: project.id },
      });
      if (proposal) {
        project.acceptedProposalId = proposal.id;
        const pEmail = (proposal as any).userEmail || (proposal as any).email;
        if (!project.assignedBusinessEmail && pEmail) {
          project.assignedBusinessEmail = pEmail;
        }
      }
    }

    const existing = await this.participantRepository.findOne({
      where: { projectId: project.id, userId: effectiveBusinessId },
    });
    if (!existing) {
      await this.participantRepository.save(
        this.participantRepository.create({
          projectId: project.id,
          userId: effectiveBusinessId,
          userName: applicant.businessName,
          role: ParticipantRole.MEMBER,
          accountType: 'business',
        }),
      );
    }

    const saved = await this.projectRepository.save(project);

    // Notify the assigned business user
    this.triggerNotification({
      userId: effectiveBusinessId,
      type: 'TECHNICAL_PROJECT_ASSIGNED',
      title: 'Congratulations! Project Assigned',
      message: `You have been selected and assigned to project "${project.title}" (${project.projectId}).`,
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
    const numericId = Number(projectId);
    const whereConditions: any[] = [{ projectId }];
    if (!isNaN(numericId) && numericId > 0) {
      whereConditions.push({ id: numericId });
    }

    const project = await this.projectRepository.findOne({
      where: whereConditions,
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    let existing = await this.proposalRepository.findOne({
      where: { projectId: project.id, userId },
    });
    if (existing) {
      return existing;
    }

    const proposalData = typeof applyDto?.proposal === 'string' && applyDto.proposal.startsWith('{')
      ? applyDto.proposal
      : JSON.stringify({
          text: applyDto?.proposal || 'Submitted application for technical project.',
          businessName: applyDto?.businessName || (applyDto as any)?.companyName || '',
          userName: (applyDto as any)?.userName || (applyDto as any)?.fullName || '',
          fullName: (applyDto as any)?.fullName || (applyDto as any)?.userName || '',
          businessType: (applyDto as any)?.businessType || (applyDto as any)?.businessIndustry || (applyDto as any)?.businessCategory || (applyDto as any)?.industry || '',
          businessId: (applyDto as any)?.businessId || null,
          kycStatus: (applyDto as any)?.kycStatus || 'verified',
        });

    const savedProposal = await this.proposalRepository.save(
      this.proposalRepository.create({
        projectId: project.id,
        userId,
        proposal: proposalData,
        price: applyDto?.price || project.adminBudget || project.price || 0,
        currency: applyDto?.currency || project.currency || 'USD',
        timeline: applyDto?.timeline || '14 Days',
        paymentType: applyDto?.paymentType || (project.paymentType as any) || 'fixed',
      }),
    );

    // Notify client who created the project
    const targetUserId = project.clientId || project.createdBy;
    const businessDisplayName = (applyDto as any)?.businessName || (applyDto as any)?.userName || userId || 'Business Provider';

    if (targetUserId) {
      this.triggerNotification({
        userId: targetUserId,
        type: 'TECHNICAL_PROJECT_APPLIED',
        title: 'New Project Application',
        message: `${businessDisplayName} applied for project "${project.title}" (${project.projectId})`,
        priority: 'high',
        href: '/dashboard/user/technical',
      });
    }

    return savedProposal;
  }

  async findMyApplications(userId: string): Promise<any> {
    const proposals = await this.proposalRepository.find({
      where: { userId },
      relations: ['project'],
      order: { createdAt: 'DESC' },
    });

    const allProjects = await this.projectRepository.find();
    const projectMap = new Map<string, Project>();
    allProjects.forEach((p) => {
      if (p.id) projectMap.set(String(p.id), p);
      if (p.projectId) projectMap.set(String(p.projectId), p);
    });

    const projects = proposals.map((p) => {
      const proj = p.project || projectMap.get(String(p.projectId)) || ({} as Partial<Project>);
      return {
        ...proj,
        isApplied: true,
        appliedAt: p.createdAt,
        proposalId: p.proposalId,
        proposalPrice: p.price,
      };
    });

    const appliedProjectIds = Array.from(
      new Set(
        proposals
          .flatMap((p) => {
            const proj = p.project || projectMap.get(String(p.projectId));
            return [
              proj?.projectId,
              proj?.id !== undefined ? String(proj.id) : undefined,
              proj?.id !== undefined ? `PRJ-${proj.id}` : undefined,
              String(p.projectId),
            ];
          })
          .filter((id): id is string => Boolean(id)),
      ),
    );

    return {
      appliedProjectIds,
      proposals,
      projects,
    };
  }

  async findProposals(projectId: string, query: ProposalQueryDto): Promise<any> {
    const { page = 1, limit = 100, timeline, paymentType } = query;
    const skip = (page - 1) * limit;

    const numericId = Number(projectId);
    const whereConditions: any[] = [{ projectId }];
    if (!isNaN(numericId) && numericId > 0) {
      whereConditions.push({ id: numericId });
    }

    const project = await this.projectRepository.findOne({ where: whereConditions });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const qb = this.proposalRepository
      .createQueryBuilder('proposal')
      .where('proposal.projectId = :projectId', { projectId: project.id });

    if (timeline) qb.andWhere('proposal.timeline LIKE :timeline', { timeline: `%${timeline}%` });
    if (paymentType) qb.andWhere('proposal.paymentType = :paymentType', { paymentType });

    const [rawProposals, total] = await qb.orderBy('proposal.createdAt', 'ASC').skip(skip).take(limit).getManyAndCount();

    const proposals = rawProposals.map((p, idx) => {
      let meta: any = {};
      try {
        if (p.proposal && (p.proposal.startsWith('{') || p.proposal.startsWith('['))) {
          meta = JSON.parse(p.proposal);
        }
      } catch {}

      const customBusinessId =
        meta.businessId ||
        (p.userId && String(p.userId).startsWith('BSN')
          ? p.userId
          : `BSN-${String(idx + 1).padStart(2, '0')}`);

      const resolvedBusinessType =
        meta.businessType ||
        meta.businessIndustry ||
        meta.businessCategory ||
        meta.industry ||
        (p as any).businessType ||
        (p as any).businessIndustry ||
        'Technology';

      return {
        ...p,
        businessId: customBusinessId,
        fullName: meta.fullName || meta.userName || (p as any).userName || p.userId || '',
        businessName: meta.businessName || (p as any).businessName || '',
        businessType: resolvedBusinessType,
        accountStatus: meta.kycStatus || 'verified',
        proposalMessage: meta.text || p.proposal,
      };
    });

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

  async deleteProposal(projectId: string, proposalId: string): Promise<any> {
    const numericProjectId = Number(projectId);
    const projectWhere: any[] = [{ projectId }];
    if (!isNaN(numericProjectId) && numericProjectId > 0) {
      projectWhere.push({ id: numericProjectId });
    }

    const project = await this.projectRepository.findOne({ where: projectWhere });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const proposalWhere: any[] = [
      { proposalId, projectId: project.id },
      { userId: proposalId, projectId: project.id },
    ];
    const numericProposalId = Number(proposalId);
    if (!isNaN(numericProposalId) && numericProposalId > 0) {
      proposalWhere.push({ id: numericProposalId, projectId: project.id });
    }

    const proposal = await this.proposalRepository.findOne({ where: proposalWhere });
    if (!proposal) {
      return { success: true, message: 'Proposal not found or already deleted' };
    }

    const applicantUserId = proposal.userId;
    await this.proposalRepository.remove(proposal);

    return {
      success: true,
      message: 'Proposal deleted successfully',
      deletedProposalId: proposal.proposalId,
      applicantUserId,
    };
  }
}
