import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../../../common/services/jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (request.headers['x-access-token']) {
      token = String(request.headers['x-access-token']);
    } else if ((request as any).cookies) {
      token =
        (request as any).cookies['accessToken'] ||
        (request as any).cookies['token'] ||
        (request as any).cookies['client_access_token'];
    }

    if (!token && (request as any).query?.token) {
      token = String((request as any).query.token);
    }

    if (!token) {
      throw new UnauthorizedException('Authorization header missing');
    }

    let payload: any = this.jwtService.verifyAccessToken(token);

    if (!payload) {
      // Try verifying as admin token
      payload = this.jwtService.verifyAdminToken(token);
    }

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as any).user = payload;
    return true;
  }
}


