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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header missing');
    }

    const token = authHeader.split(' ')[1];
    const payload = this.jwtService.verifyUserToken(token, true);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as any).user = {
      userId: payload.userId || payload.sub || (payload as any).adminId || 'system',
      email: payload.email,
      phone: payload.phone,
      role: payload.role || payload.accountType || (payload as any).aud,
    };

    return true;
  }
}
