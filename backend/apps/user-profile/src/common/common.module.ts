import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from './services/jwt.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [JwtService, JwtAuthGuard, AdminAuthGuard],
  exports: [JwtService, JwtAuthGuard, AdminAuthGuard],
})
export class CommonModule {}
