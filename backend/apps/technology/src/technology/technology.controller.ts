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
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TechnicalServiceService } from './services/technical-service.service';
import { TechnicalCategoryService } from './services/technical-category.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ServiceQueryDto, CategoryQueryDto, ReorderDto } from './dto/query-params.dto';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestWithAdmin, RequestWithUser } from '../common/interfaces/request.interface';

import { ServiceTaxonomyService } from './services/service-taxonomy.service';

@ApiTags('services')
@Controller('services')
export class TechnologyController {
  constructor(
    private readonly technicalServiceService: TechnicalServiceService,
    private readonly technicalCategoryService: TechnicalCategoryService,
    private readonly taxonomyService: ServiceTaxonomyService,
  ) {}

  @Get('taxonomy')
  @ApiOperation({ summary: 'Get categories, subcategories, and skills for service' })
  async getTaxonomy(@Query('serviceType') serviceType?: string) {
    return this.taxonomyService.getTaxonomy(serviceType || 'technology');
  }

  @Post('taxonomy/add')
  @ApiOperation({ summary: 'Add category, subcategory, or skill' })
  async addTaxonomyItem(
    @Body()
    body: {
      serviceType?: string;
      type: 'category' | 'subcategory' | 'skill';
      name: string;
      parentCategory?: string;
    },
  ) {
    return this.taxonomyService.addItem(body);
  }

  @Post('taxonomy/remove')
  @ApiOperation({ summary: 'Remove category, subcategory, or skill' })
  async removeTaxonomyItem(
    @Body()
    body: {
      serviceType?: string;
      type: 'category' | 'subcategory' | 'skill';
      name: string;
    },
  ) {
    return this.taxonomyService.removeItem(body);
  }

  // ==========================================
  // PUBLIC ROUTES - Services
  // ==========================================

  @Get()
  @ApiOperation({ summary: 'Get all visible technical services (Public)' })
  @ApiResponse({ status: 200, description: 'List of services' })
  async getServices(@Query() query: ServiceQueryDto) {
    return this.technicalServiceService.findAll(query, false);
  }

  // ==========================================
  // AUTHENTICATED USER/AGENCY ROUTES - Services
  // ==========================================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create technical service (User/Agency/Business)' })
  @ApiResponse({ status: 201, description: 'Service created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createService(@Body() createDto: CreateServiceDto, @Req() req: RequestWithUser) {
    return this.createServiceForAccountTypes(createDto, req, ['user', 'agency', 'business']);
  }

  @Post('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create technical service (User only)' })
  async createUserService(@Body() createDto: CreateServiceDto, @Req() req: RequestWithUser) {
    return this.createServiceForAccountTypes(createDto, req, ['user']);
  }

  @Post('agent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create technical service (Agent/Agency only)' })
  async createAgentService(@Body() createDto: CreateServiceDto, @Req() req: RequestWithUser) {
    return this.createServiceForAccountTypes(createDto, req, ['agency']);
  }

  @Get('admin/list')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all technical services (Admin)' })
  @ApiResponse({ status: 200, description: 'List of all services' })
  async getAdminServices(@Query() query: ServiceQueryDto, @Req() req: Request) {
    // Handle empty string in query params (transform might not catch it)
    const rawIsVisible = req.query?.isVisible as string | undefined;
    if (rawIsVisible === '' || rawIsVisible === null || rawIsVisible === undefined) {
      // If raw query param is empty, set to undefined to show all services
      query.isVisible = undefined;
    }
    return this.technicalServiceService.findAll(query, true);
  }

  @Get('admin/:serviceId')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get single technical service (Admin)' })
  async getAdminService(@Param('serviceId') serviceId: string) {
    return this.technicalServiceService.findOne(serviceId, true);
  }

  // Public route for single service (must come after admin routes)
  @Get(':serviceId')
  @ApiOperation({ summary: 'Get single technical service (Public)' })
  @ApiResponse({ status: 200, description: 'Service details' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getService(@Param('serviceId') serviceId: string) {
    return this.technicalServiceService.findOne(serviceId, false);
  }

  @Patch(':serviceId')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update technical service (Admin)' })
  @ApiResponse({ status: 200, description: 'Service updated successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async updateService(
    @Param('serviceId') serviceId: string,
    @Body() updateDto: UpdateServiceDto,
    @Req() req: RequestWithAdmin,
  ) {
    return this.technicalServiceService.update(serviceId, updateDto, req.admin?.email || 'system');
  }

  @Delete(':serviceId')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete technical service (Admin)' })
  @ApiResponse({ status: 200, description: 'Service deleted successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async deleteService(@Param('serviceId') serviceId: string) {
    await this.technicalServiceService.remove(serviceId);
    return { success: true, message: 'Service deleted successfully' };
  }

  @Patch('user/:serviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update technical service (User owns service)' })
  async updateUserService(
    @Param('serviceId') serviceId: string,
    @Body() updateDto: UpdateServiceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.updateServiceForAccountTypes(serviceId, updateDto, req, ['user']);
  }

  @Patch('agent/:serviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update technical service (Agent/Agency owns service)' })
  async updateAgentService(
    @Param('serviceId') serviceId: string,
    @Body() updateDto: UpdateServiceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.updateServiceForAccountTypes(serviceId, updateDto, req, ['agency']);
  }

  @Delete('user/:serviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete technical service (User owns service)' })
  async deleteUserService(@Param('serviceId') serviceId: string, @Req() req: RequestWithUser) {
    await this.deleteServiceForAccountTypes(serviceId, req, ['user']);
    return { success: true, message: 'Service deleted successfully' };
  }

  @Delete('agent/:serviceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete technical service (Agent/Agency owns service)' })
  async deleteAgentService(@Param('serviceId') serviceId: string, @Req() req: RequestWithUser) {
    await this.deleteServiceForAccountTypes(serviceId, req, ['agency']);
    return { success: true, message: 'Service deleted successfully' };
  }

  @Patch(':serviceId/visibility')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle service visibility (Admin)' })
  @ApiResponse({ status: 200, description: 'Visibility updated' })
  async toggleVisibility(
    @Param('serviceId') serviceId: string,
    @Body('isVisible') isVisible: boolean,
    @Req() req: RequestWithAdmin,
  ) {
    return this.technicalServiceService.toggleVisibility(
      serviceId,
      isVisible,
      req.admin?.email || 'system',
    );
  }

  @Patch(':serviceId/reorder')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reorder service (Admin)' })
  @ApiResponse({ status: 200, description: 'Service reordered' })
  async reorderService(@Param('serviceId') serviceId: string, @Body() reorderDto: ReorderDto) {
    return this.technicalServiceService.reorder(serviceId, reorderDto.direction);
  }

  // ==========================================
  // PUBLIC ROUTES - Categories
  // ==========================================

  @Get('categories/list')
  @ApiOperation({ summary: 'Get all active technical categories (Public)' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories(@Query() query: CategoryQueryDto) {
    const activeQuery = { ...query, isActive: true };
    return this.technicalCategoryService.findAll(activeQuery);
  }

  // ==========================================
  // ADMIN ROUTES - Categories
  // ==========================================

  @Post('categories')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create technical category (Admin)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category already exists' })
  async createCategory(@Body() createDto: CreateCategoryDto) {
    return this.technicalCategoryService.create(createDto);
  }

  @Get('admin/categories/list')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all technical categories (Admin)' })
  async getAdminCategories(@Query() query: CategoryQueryDto) {
    return this.technicalCategoryService.findAll(query);
  }

  @Get('admin/categories/:categoryId')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get single category (Admin)' })
  async getAdminCategory(@Param('categoryId') categoryId: string) {
    return this.technicalCategoryService.findOne(categoryId);
  }

  @Patch('categories/:categoryId')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update category (Admin)' })
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() updateDto: UpdateCategoryDto,
  ) {
    return this.technicalCategoryService.update(categoryId, updateDto);
  }

  @Delete('categories/:categoryId')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete category (Admin)' })
  @ApiResponse({ status: 400, description: 'Category is in use' })
  async deleteCategory(@Param('categoryId') categoryId: string) {
    await this.technicalCategoryService.remove(categoryId);
    return { success: true, message: 'Category deleted successfully' };
  }

  private createServiceForAccountTypes(
    createDto: CreateServiceDto,
    req: RequestWithUser,
    allowedTypes: string[],
  ) {
    const user = this.ensureAccountType(req, allowedTypes, 'create services');
    return this.technicalServiceService.create(createDto, user.userId);
  }

  private updateServiceForAccountTypes(
    serviceId: string,
    updateDto: UpdateServiceDto,
    req: RequestWithUser,
    allowedTypes: string[],
  ) {
    const user = this.ensureAccountType(req, allowedTypes, 'update services');
    return this.technicalServiceService.updateOwnedService(serviceId, updateDto, user.userId);
  }

  private async deleteServiceForAccountTypes(
    serviceId: string,
    req: RequestWithUser,
    allowedTypes: string[],
  ) {
    const user = this.ensureAccountType(req, allowedTypes, 'delete services');
    await this.technicalServiceService.removeOwnedService(serviceId, user.userId);
  }

  private ensureAccountType(req: RequestWithUser, allowedTypes: string[], action: string) {
    const user = req.user;
    if (!user?.accountType) {
      throw new ForbiddenException('Invalid user context');
    }

    if (!allowedTypes.includes(user.accountType)) {
      throw new ForbiddenException(`Only ${allowedTypes.join('/')} accounts can ${action}`);
    }

    if (!user.userId) {
      throw new ForbiddenException('Missing user identifier');
    }

    return user;
  }
}
