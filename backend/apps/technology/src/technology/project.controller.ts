import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from './services/project.service';
import { TaskService } from './services/task.service';
import { MessageService } from './services/message.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { ApplyProjectDto } from './dto/apply-project.dto';
import { ProposalQueryDto } from './dto/proposal-query.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UnifiedAuthGuard } from '../common/guards/unified-auth.guard';
import { ParticipantRole } from './entities/project-participant.entity';

@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly messageService: MessageService,
  ) {}

  // ─── PROJECT CRUD ───────────────────────────────────────────────────────────

  @Post()
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new project (client)' })
  async createProject(@Body() createDto: CreateProjectDto, @Req() req: any) {
    const creatorId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.projectService.create(createDto, creatorId);
  }

  @Get('public')
  @ApiOperation({ summary: 'List all public active projects (for business to browse)' })
  async listPublicProjects(@Query() query: ProjectQueryDto) {
    return this.projectService.findAll(query, undefined, { publicOnly: true });
  }

  @Get('all')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: list all projects' })
  async listAllProjects(@Query() query: ProjectQueryDto) {
    return this.projectService.findAll(query);
  }

  @Get('mine')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Client: list own projects' })
  async getMyProjects(@Query() query: ProjectQueryDto, @Req() req: any) {
    const userId = req.user?.userId;
    return this.projectService.findAll(query, userId);
  }

  @Get('assigned')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Business: list projects assigned to me' })
  async getAssignedProjects(@Query() query: ProjectQueryDto, @Req() req: any) {
    const businessId = req.user?.userId;
    return this.projectService.findAll(query, undefined, { assignedTo: businessId });
  }

  @Get('my-applications')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Business: list all projects I have applied to' })
  async getMyApplications(@Req() req: any) {
    const businessId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.projectService.findMyApplications(businessId);
  }

  @Get(':projectId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get single project' })
  async getProject(@Param('projectId') projectId: string, @Req() req: any) {
    return this.projectService.findOne(projectId);
  }

  @Patch(':projectId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update project' })
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() updateDto: UpdateProjectDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.projectService.update(projectId, updateDto, userId);
  }

  @Delete(':projectId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete project' })
  async deleteProject(@Param('projectId') projectId: string, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    await this.projectService.remove(projectId, userId);
    return { success: true, message: 'Project deleted successfully' };
  }

  // ─── LIFECYCLE ENDPOINTS ────────────────────────────────────────────────────

  @Post(':projectId/submit')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Client submits project for admin review' })
  async submitProject(@Param('projectId') projectId: string, @Req() req: any) {
    const clientId = req.user?.userId;
    return this.projectService.submitProject(projectId, clientId);
  }

  @Post(':projectId/admin-approve')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin approves project and sets budget' })
  async adminApprove(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      adminBudget: number;
      minBudget?: number;
      requirements?: string;
      conditions?: string;
      adminNotes?: string;
      commissionPercent?: number;
    },
    @Req() req: any,
  ) {
    const adminId = req.admin?.adminId || req.user?.userId || 'admin';
    return this.projectService.adminApprove(projectId, adminId, body);
  }

  @Post(':projectId/admin-reject')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin rejects project' })
  async adminReject(
    @Param('projectId') projectId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const adminId = req.admin?.adminId || req.user?.userId || 'admin';
    return this.projectService.adminReject(projectId, adminId, body.reason);
  }

  @Post(':projectId/pay')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Client pays for approved project (deducts from wallet)' })
  async payProject(@Param('projectId') projectId: string, @Req() req: any) {
    const clientId = req.user?.userId || req.user?.id || req.user?.sub || req.user?.email || 'user';
    return this.projectService.payProject(projectId, clientId);
  }

  @Post(':projectId/accept')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Business accepts / takes on an active project' })
  async acceptProject(
    @Param('projectId') projectId: string,
    @Body() body: { businessName?: string },
    @Req() req: any,
  ) {
    const businessId = req.user?.userId;
    const businessName = body.businessName || businessId;
    return this.projectService.acceptProject(projectId, businessId, businessName);
  }

  @Post(':projectId/complete')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Business marks project complete and uploads deliverables' })
  async markComplete(
    @Param('projectId') projectId: string,
    @Body() body: { deliverableUrls?: string[]; completionNotes?: string },
    @Req() req: any,
  ) {
    const businessId = req.user?.userId;
    return this.projectService.markComplete(projectId, businessId, body);
  }

  @Post(':projectId/review-accept')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Client/Admin accepts completed project → releases payment' })
  async reviewAccept(@Param('projectId') projectId: string, @Req() req: any) {
    const reviewerId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.projectService.reviewAccept(projectId, reviewerId);
  }

  @Post(':projectId/request-revision')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Client/Admin requests revision on completed project' })
  async requestRevision(
    @Param('projectId') projectId: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    const reviewerId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.projectService.requestRevision(projectId, reviewerId, body.reason);
  }

  // ─── PROPOSALS ──────────────────────────────────────────────────────────────

  @Post(':projectId/apply')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Apply for project' })
  async applyToProject(
    @Param('projectId') projectId: string,
    @Body() applyDto: ApplyProjectDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.projectService.applyForProject(projectId, applyDto, userId);
  }

  @Get(':projectId/proposals')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get proposals for project' })
  async getProposals(@Param('projectId') projectId: string, @Query() query: ProposalQueryDto) {
    return this.projectService.findProposals(projectId, query);
  }

  @Delete(':projectId/proposals/:proposalId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a proposal' })
  async deleteProposal(
    @Param('projectId') projectId: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.projectService.deleteProposal(projectId, proposalId);
  }

  // ─── PARTICIPANTS ────────────────────────────────────────────────────────────

  @Post(':projectId/participants')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async addParticipant(
    @Param('projectId') projectId: string,
    @Body() body: { userId: string; userName: string; role: ParticipantRole; accountType: string },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.projectService.addParticipant(projectId, body.userId, body.userName, body.role, userId, body.accountType);
  }

  @Patch(':projectId/participants/:userId/role')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async updateParticipantRole(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Body() body: { role: ParticipantRole },
    @Req() req: any,
  ) {
    const updaterId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.projectService.updateParticipantRole(projectId, userId, body.role, updaterId);
  }

  // ─── TASKS ──────────────────────────────────────────────────────────────────

  @Post(':projectId/tasks')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async createTask(@Param('projectId') projectId: string, @Body() createDto: CreateTaskDto, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.taskService.create(projectId, createDto, userId);
  }

  @Get(':projectId/tasks')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getTasks(@Param('projectId') projectId: string, @Query() query: TaskQueryDto, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    query.projectId = projectId;
    return this.taskService.findAll(query, userId);
  }

  @Get('tasks/:taskId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getProjectTask(@Param('taskId') taskId: string, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.taskService.findOne(parseInt(taskId), userId);
  }

  @Patch('tasks/:taskId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async updateTask(@Param('taskId') taskId: string, @Body() updateDto: UpdateTaskDto, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.taskService.update(parseInt(taskId), updateDto, userId);
  }

  @Delete('tasks/:taskId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  async deleteTask(@Param('taskId') taskId: string, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    await this.taskService.remove(parseInt(taskId), userId);
    return { success: true, message: 'Task deleted' };
  }

  // ─── MESSAGES ───────────────────────────────────────────────────────────────

  @Post(':projectId/messages')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async createMessage(@Param('projectId') projectId: string, @Body() createDto: CreateMessageDto, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.messageService.create(projectId, createDto, userId, userId);
  }

  @Get(':projectId/messages')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getMessages(@Param('projectId') projectId: string, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.messageService.findAll(projectId, userId);
  }

  @Get('messages/:messageId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getMessage(@Param('messageId') messageId: string, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.messageService.findOne(parseInt(messageId), userId);
  }

  @Patch('messages/:messageId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async updateMessage(@Param('messageId') messageId: string, @Body() updateDto: UpdateMessageDto, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    return this.messageService.update(parseInt(messageId), updateDto, userId);
  }

  @Delete('messages/:messageId')
  @UseGuards(UnifiedAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(@Param('messageId') messageId: string, @Req() req: any) {
    const userId = req.user?.userId || req.admin?.adminId || 'admin';
    await this.messageService.remove(parseInt(messageId), userId);
    return { success: true, message: 'Message deleted' };
  }
}
