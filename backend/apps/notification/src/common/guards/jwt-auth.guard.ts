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

    // Extract token: prefer Authorization header (admin uses Bearer),
    // fall back to accessToken cookie (frontend user uses cookie-based auth)
    let token: string | undefined;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (request.cookies?.accessToken) {
      token = request.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedException('No auth token found');
    }

    const payload = this.jwtService.verifyUserToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Admin tokens use `adminId`; user tokens use `userId`. Unify into req.user.userId.
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