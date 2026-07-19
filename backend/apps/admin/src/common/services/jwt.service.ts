import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify, JwtPayload, sign } from 'jsonwebtoken';
import { randomUUID, createHash, createPublicKey } from 'crypto';
import { StringValue } from 'ms';
import * as ms from 'ms';

export interface AdminTokenPayload extends JwtPayload {
  sub: string;
  adminId: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtService {
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly issuer: string;
  private readonly keyId: string;
  private readonly accessTokenTtl: StringValue | number;

  constructor(private readonly configService: ConfigService) {
    const providedPrivateKey =
      this.configService.get<string>('SSO_PRIVATE_KEY');
    const providedPublicKey =
      this.configService.get<string>('SSO_PUBLIC_KEY');

    if (!providedPrivateKey || !providedPublicKey) {
      throw new Error('SSO_PRIVATE_KEY and SSO_PUBLIC_KEY are required');
    }

    // Normalize keys (handle escaped \n and wrapped quotes)
    const stripQuotes = (v: string) => {
      const trimmed = v.trim();
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        return trimmed.slice(1, -1);
      }
      return trimmed;
    };

    this.privateKey = stripQuotes(providedPrivateKey).replace(
      /\\n/g,
      '\n',
    );
    this.publicKey = stripQuotes(providedPublicKey).replace(
      /\\n/g,
      '\n',
    );

    // Generate key ID from public key JWK
    const keyObject = createPublicKey(this.publicKey);
    const jwk = keyObject.export({ format: 'jwk' }) as Record<
      string,
      string
    >;

    this.keyId = createHash('sha256')
      .update(JSON.stringify(jwk))
      .digest('hex')
      .slice(0, 32);

    const ssoPort = this.configService.get('SSO_PORT', 3001);
    const defaultIssuer = `http://localhost:${ssoPort}/sso`;

    this.issuer =
      this.configService.get<string>('SSO_ISSUER') || defaultIssuer;

    // ✅ TTL supports both number and string
    const rawTtl =
      this.configService.get<StringValue>('ACCESS_TOKEN_TTL') || '7d';

    this.accessTokenTtl = /^\d+$/.test(rawTtl)
      ? parseInt(rawTtl, 10)
      : rawTtl;
  }

  getAccessTokenTtlSeconds(): number | StringValue {
    return this.accessTokenTtl;
  }

  signAdminToken(payload: {
    adminId: string;
    email: string;
    role: string;
  }) {
    const jti = randomUUID();
    const expiresIn = this.accessTokenTtl;

    const token = sign(
      {
        adminId: payload.adminId,
        email: payload.email,
        role: payload.role,
        sub: payload.adminId,
        iss: this.issuer,
        aud: 'admin',
        jti,
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn,
        keyid: this.keyId,
      },
    );

    // ✅ Proper expiresAt calculation
    const expiresInMs =
      typeof expiresIn === 'number'
        ? expiresIn * 1000
        : ms(expiresIn);

    return {
      token,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresInMs),
    };
  }

  verifyAdminToken(token: string): AdminTokenPayload | null {
    try {
      const payload = verify(token, this.publicKey, {
        algorithms: ['RS256'],
        audience: 'admin',
      }) as AdminTokenPayload;

      if (!payload.adminId || !payload.email || !payload.role) {
        Logger.warn(
          'Admin token missing required fields: ' + JSON.stringify(payload),
          JwtService.name,
        );
        return null;
      }

      return payload;
    } catch (error) {
      Logger.error(
        `Token verification failed: ${error.message} - token: ${token.substring(0, 20)}...`,
        error.stack,
        JwtService.name,
      );
      return null;
    }
  }
}