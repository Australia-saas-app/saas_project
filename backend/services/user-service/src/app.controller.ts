import { Controller, Post, Body, Get, Query, Patch, Param, Delete, HttpException, HttpStatus, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './auth.guard';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dtos';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('auth/register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async register(@Body() body: RegisterDto) {
    try {
      const user = await this.appService.registerUser(body);
      return { success: true, data: user };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch('auth/change-password')
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async changePassword(@Body() body: ChangePasswordDto) {
    try {
      const success = await this.appService.changePassword(body);
      return { success };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('users')
  async getUsers(@Query('role') role: string) {
    const users = await this.appService.getAllUsersByRole(role);
    return { success: true, data: users };
  }

  @Post('auth/login')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async login(@Body() body: LoginDto) {
    try {
      const { user, token } = await this.appService.loginUser(body);
      
      // Status Guard (Super admins bypass this)
      if (user.role !== 'super-admin' && user.status !== 'ACTIVE' && user.status !== 'active') {
        throw new HttpException({
          status: HttpStatus.FORBIDDEN,
          error: user.status.toUpperCase(),
        }, HttpStatus.FORBIDDEN);
      }
      
      return { success: true, token, data: user };
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(e.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Patch('users/:id/status')
  @UseGuards(AuthGuard)
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    try {
      const user = await this.appService.updateUserStatus(id, status);
      return { success: true, data: user };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('users/:id')
  @UseGuards(AuthGuard)
  async deleteUser(@Param('id') id: string) {
    try {
      const success = await this.appService.deleteUser(id);
      return { success };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}
