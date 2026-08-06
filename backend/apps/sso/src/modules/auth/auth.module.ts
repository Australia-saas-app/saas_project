import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { Admin } from '../../entities/admin.entity';
import { UserSession } from '../../entities/user-session.entity';
import { TokenModule } from '../token/token.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import { KycApplication } from '../../entities/kyc-application.entity';
import { OtpUtil } from '../../common/utils/otp.util';

@Module({
  imports: [TypeOrmModule.forFeature([User, Admin, UserSession, KycApplication]), TokenModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AccessTokenGuard, OtpUtil],
})
export class AuthModule {}


