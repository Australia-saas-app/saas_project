import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  userId: string;
  accountType: string;
  scope: string;
  sessionId: string;
  clientId?: string;
}

export interface AdminTokenPayload extends JwtPayload {
  sub: string;
  adminId: string;
  email: string;
  role: string;
}

@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  private readonly publicKey: string;
  private readonly issuer: string;

  constructor(private readonly configService: ConfigService) {
    const rawPublicKey = this.configService.get<string>('SSO_PUBLIC_KEY');
    if (!rawPublicKey) {
      throw new Error('SSO_PUBLIC_KEY is not configured');
    }

    let formattedKey = rawPublicKey.replace(/\\n/g, '\n');
    if (!formattedKey.includes('\n') && formattedKey.includes('-----BEGIN')) {
      const beginMatch = formattedKey.match(/-----BEGIN[^-]+-----/);
      const endMatch = formattedKey.match(/-----END[^-]+-----/);
      const base64Part = formattedKey
        .replace(/-----BEGIN[^-]+-----/, '')
        .replace(/-----END[^-]+-----/, '')
        .replace(/\s/g, '');

      if (beginMatch && endMatch && base64Part) {
        const formattedBase64 = base64Part.match(/.{1,64}/g)?.join('\n') || base64Part;
        formattedKey = `${beginMatch[0]}\n${formattedBase64}\n${endMatch[0]}\n`;
      }
    }

    this.publicKey = formattedKey;
    this.issuer = this.configService.get<string>('SSO_ISSUER') || 'http://localhost:3001/sso';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (request.cookies?.accessToken) {
      token = request.cookies.accessToken;
    } else if (request.cookies?.token) {
      token = request.cookies.token;
    }

    if (!token) {
      throw new UnauthorizedException('Authorization token missing');
    }

    // Try verifying as Admin token first (usually has audience 'admin')
    try {
      const decoded: any = verify(token, this.publicKey, {
        algorithms: ['RS256'],
      });

      if (decoded.aud === 'admin') {
        // Verify as Admin token
        const payload = decoded as AdminTokenPayload;
        if (payload.adminId) {
          (request as any).admin = {
            adminId: payload.adminId,
            email: payload.email,
            role: payload.role,
          };
          return true;
        }
      }
    } catch (e) {
      // Not an admin token or verification failed, try User token
    }

    // Try verifying as User token
    try {
      const payload = verify(token, this.publicKey, {
        algorithms: ['RS256'],
      }) as AccessTokenPayload;

      if (payload && payload.userId) {
        (request as any).user = {
          userId: payload.userId,
          accountType: payload.accountType,
          sessionId: payload.sessionId,
        };
        return true;
      }
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    throw new UnauthorizedException('Invalid token payload');
  }
}
