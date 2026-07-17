import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { TokenModule } from '../token/token.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OtpUtil } from '../../common/utils/otp.util';

@Module({
  imports: [TypeOrmModule.forFeature([User, Admin]), TokenModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, OtpUtil],
})
export class AuthModule {}


