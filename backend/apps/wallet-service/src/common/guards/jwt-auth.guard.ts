import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../services/jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if ((request as any).cookies?.accessToken) {
      token = (request as any).cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token required');
    }

    // Try admin token
    const adminPayload = this.jwtService.verifyAdminToken(token);
    if (adminPayload) {
      (request as any).admin = adminPayload;
      (request as any).user = {
        userId: adminPayload.adminId,
        email: adminPayload.email,
        role: adminPayload.role,
      };
      return true;
    }

    // Try user access token
    const userPayload = this.jwtService.verifyAccessToken(token);
    if (userPayload && userPayload.userId) {
      (request as any).user = {
        userId: userPayload.userId,
        accountType: userPayload.accountType,
        sessionId: userPayload.sessionId,
        role: userPayload.role || userPayload.accountType,
      };
      return true;
    }

    throw new UnauthorizedException('Invalid or expired token');
  }
}
