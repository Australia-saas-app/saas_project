import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { VerifyContactOtpDto } from './dto/verify-contact-otp.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('sso/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Delete('admin/users/:userId')
  @UseGuards(JwtAuthGuard)
  deleteUser(@Param('userId') userId: string, @Request() req: any) {
    if (req.user?.role !== 'super_admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.authService.deleteUser(userId);
  }

  @Post('user/register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('user/verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto, @Request() req: ExpressRequest) {
    return this.authService.login(loginDto, req);
  }

  @Post('user/forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Patch('user/preferences')
  @UseGuards(JwtAuthGuard)
  updatePreferences(@Body() updatePreferencesDto: UpdatePreferencesDto, @Request() req: ExpressRequest) {
    const userId = (req.user as any).userId;
    return this.authService.updatePreferences(userId, (updatePreferencesDto.preferences || updatePreferencesDto) as any);
  }

  @Post('user/reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
  }

  @Post('admin/forgot-password')
  adminForgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.adminForgotPassword(forgotPasswordDto);
  }

  @Post('admin/reset-password')
  adminResetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.adminResetPassword(resetPasswordDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Request() req: any) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.authService.getCurrentUser(req.user.userId);
  }

  @Post('send-otp')
  sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body.email, body.phone, body.type || 'login');
  }

  @Post('verify-otp/generic')
  verifyGenericOtp(@Body() verifyContactOtpDto: VerifyContactOtpDto) {
    return this.authService.verifyGenericOtp(verifyContactOtpDto);
  }

  @Post('verify-password')
  verifyPassword(@Body() verifyPasswordDto: VerifyPasswordDto) {
    return this.authService.verifyPassword(verifyPasswordDto);
  }

  @Post('verify-recovery-key')
  verifyRecoveryKey(@Body() body: { recoveryKey: string }) {
    return this.authService.verifyRecoveryKey(body.recoveryKey);
  }

  @Post('user/complete-profile')
  @UseGuards(JwtAuthGuard)
  completeProfile(
    @Request() req: any,
    @Body() dto: CompleteProfileDto,
  ) {
    if (!req.user?.userId) {
      throw new ForbiddenException('Invalid authentication payload');
    }
    return this.authService.completeProfile(req.user.userId, dto);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard)
  getUsers(@Query() query: any, @Request() req: any) {
    if (req.user?.role !== 'super_admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.authService.getUsers(query);
  }

  @Get('admin/users/:userId')
  @UseGuards(JwtAuthGuard)
  getUserDetails(@Param('userId') userId: string, @Request() req: any) {
    if (req.user?.role !== 'super_admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.authService.getUserDetails(userId);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard)
  async getAdminStats(@Request() req: any) {
    if (req.user?.role !== 'super_admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.authService.getAdminStats();
  }

  @Patch('admin/users/:userId/status')
  @UseGuards(JwtAuthGuard)
  updateUserStatus(
    @Param('userId') userId: string,
    @Body() body: UpdateUserStatusDto,
    @Request() req: any,
  ) {
    if (req.user?.role !== 'super_admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.authService.updateUserStatus(userId, body.status, body.reason || 'Status changed', (req.user as any).email);
  }

}


