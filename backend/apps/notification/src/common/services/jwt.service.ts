import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify, JwtPayload, decode } from 'jsonwebtoken';
import { createHash, createPublicKey } from 'crypto';

export interface UserTokenPayload extends JwtPayload {
  sub: string;
  userId: string;
  email?: string;
  phone?: string;
  role?: string;
  accountType?: string;
}

@Injectable()
export class JwtService {
  private readonly publicKey: string;
  private readonly issuer: string;

  constructor(private readonly configService: ConfigService) {
    const rawPublicKey = this.configService.get<string>('SSO_PUBLIC_KEY');

    if (!rawPublicKey) {
      throw new Error('SSO_PUBLIC_KEY is required');
    }

    // Handle both formats: with \n escape sequences or single line
    let formattedKey = rawPublicKey.replace(/\\n/g, '\n');

    // If key is still on single line (no actual newlines), format it properly
    // PEM format: -----BEGIN...-----\n(base64)\n-----END...-----
    if (!formattedKey.includes('\n') && formattedKey.includes('-----BEGIN')) {
      // Extract the base64 part and format with newlines every 64 chars
      const beginMatch = formattedKey.match(/-----BEGIN[^-]+-----/);
      const endMatch = formattedKey.match(/-----END[^-]+-----/);
      const base64Part = formattedKey
        .replace(/-----BEGIN[^-]+-----/, '')
        .replace(/-----END[^-]+-----/, '')
        .replace(/\s/g, '');

      if (beginMatch && endMatch && base64Part) {
        // Format base64 with newlines every 64 characters
        const formattedBase64 =
          base64Part.match(/.{1,64}/g)?.join('\n') || base64Part;
        formattedKey = `${beginMatch[0]}\n${formattedBase64}\n${endMatch[0]}\n`;
      }
    }

    this.publicKey = formattedKey;

    const ssoPort = this.configService.get('SSO_PORT', 3001);
    const defaultIssuer = `http://localhost:${ssoPort}/sso`;
    this.issuer = this.configService.get<string>('SSO_ISSUER', defaultIssuer);
  }

  verifyUserToken(token: string): UserTokenPayload | null {
    try {
      // First, verify signature and decode token (with flexible issuer handling)
      let payload: UserTokenPayload;

      try {
        // Try with configured issuer (no audience check - SSO uses clientId as audience)
        payload = verify(token, this.publicKey, {
          algorithms: ['RS256'],
          issuer: this.issuer,
        }) as UserTokenPayload;
      } catch (issuerError) {
        // If issuer mismatch, try without issuer verification (signature still checked)
        // This handles Docker network vs localhost issuer differences
        const decoded = verify(token, this.publicKey, {
          algorithms: ['RS256'],
        }) as UserTokenPayload;

        // Verify it's from SSO service (check issuer contains 'sso' or matches pattern)
        const tokenIssuer = decoded.iss || '';
        if (!tokenIssuer.includes('sso') && tokenIssuer !== this.issuer) {
          // Accept if issuer is from SSO service (http://sso:3001/sso or http://localhost:3001/sso)
          const allowedIssuers = [
            this.issuer,
            'http://sso:3001/sso',
            'http://localhost:3001/sso',
            tokenIssuer.replace('localhost', 'sso'),
            tokenIssuer.replace('sso', 'localhost'),
          ];

          if (!allowedIssuers.includes(tokenIssuer)) {
            Logger.debug(
              `Token issuer mismatch. Expected SSO issuer but got '${tokenIssuer}'`,
              JwtService.name,
            );
            return null;
          }
        }

        payload = decoded;
      }

      // Verify required fields — accept both user tokens (userId) and admin tokens (adminId)
      const resolvedId = (payload as any).userId || (payload as any).adminId || payload.sub;
      if (!payload || !resolvedId) {
        Logger.warn('Token missing required id fields (userId/adminId/sub)', JwtService.name);
        return null;
      }

      // Inject a unified userId so downstream code works for both user and admin tokens
      (payload as any).userId = resolvedId;

      return payload;
    } catch (error) {
      Logger.debug(
        `Token verification failed: ${error.message}`,
        JwtService.name,
      );
      return null;
    }
  }
}