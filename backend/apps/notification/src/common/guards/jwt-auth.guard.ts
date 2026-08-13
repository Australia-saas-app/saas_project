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
    const payload = this.jwtService.verifyUserToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Admin tokens use `adminId` as the identifier; user tokens use `userId`.
    // We unify both into req.user.userId so all service queries work for both roles.
    const resolvedId = (payload as any).userId || (payload as any).adminId || (payload as any).sub;

    (request as any).user = {
      userId: resolvedId,
      email: payload.email,
      phone: (payload as any).phone,
      role: (payload as any).role,
      adminId: (payload as any).adminId,
    };

    return true;
  }
}