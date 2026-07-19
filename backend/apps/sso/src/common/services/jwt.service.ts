import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash, createPublicKey, generateKeyPairSync } from 'crypto';
import { sign, verify, JwtPayload } from 'jsonwebtoken';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  userId: string;
  accountType: string;
  scope: string;
  sessionId: string;
  clientId?: string;
  role?: string;
}

export interface AdminTokenPayload extends JwtPayload {
  sub: string;
  adminId: string;
  email: string;
  role: string;
}

interface IdTokenPayload {
  sub: string;
  clientId: string;
  userId: string;
  fullName?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  accountType?: string;
  sessionId?: string;
  scope?: string;
}

@Injectable()
export class JwtService {
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly keyId: string;
  private readonly issuer: string;
  private readonly accessTokenTtl: number;
  private readonly refreshTokenTtl: number;

  constructor(private readonly configService: ConfigService) {
    const providedPrivateKey = this.configService.get<string>('SSO_PRIVATE_KEY');
    const providedPublicKey = this.configService.get<string>('SSO_PUBLIC_KEY');

    if (providedPrivateKey && providedPublicKey) {
      // Normalize keys: allow values with literal "\\n" sequences or single-line
      // wrapped in quotes. Remove surrounding quotes then replace escaped newlines.
      const stripQuotes = (v: string) => {
        const trimmed = v.trim();
        // Remove surrounding single or double quotes if present
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        return trimmed;
      };

      this.privateKey = stripQuotes(providedPrivateKey).replace(/\\n/g, '\n');
      this.publicKey = stripQuotes(providedPublicKey).replace(/\\n/g, '\n');
    } else {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.privateKey = privateKey.toString();
      this.publicKey = publicKey.toString();
      Logger.warn(
        'SSO private/public keys were not provided. Generated ephemeral keys for this session. Provide SSO_PRIVATE_KEY and SSO_PUBLIC_KEY for stable signing.',
        JwtService.name,
      );
    }

    const keyObject = createPublicKey(this.publicKey);
    const jwk = keyObject.export({ format: 'jwk' }) as Record<string, string>;
    this.keyId = createHash('sha256').update(JSON.stringify(jwk)).digest('hex').slice(0, 32);

    const port = this.configService.get('PORT', 3001);
    const defaultIssuer = `http://localhost:${port}/sso`;
    this.issuer = this.configService.get<string>('SSO_ISSUER', defaultIssuer);
    this.accessTokenTtl = parseInt(this.configService.get('ACCESS_TOKEN_TTL', '604800'), 10);
    this.refreshTokenTtl = parseInt(this.configService.get('REFRESH_TOKEN_TTL', '1209600'), 10); // 14 days
  }

  getAccessTokenTtlSeconds(): number {
    return this.accessTokenTtl;
  }

  getRefreshTokenTtlSeconds(): number {
    return this.refreshTokenTtl;
  }

  signAccessToken(payload: Omit<AccessTokenPayload, 'iss' | 'aud' | 'exp' | 'iat'>): { token: string; expiresAt: Date; jti: string } {
    const jti = randomUUID();
    const expiresIn = this.accessTokenTtl;
    const token = sign(
      {
        ...payload,
        iss: this.issuer,
        aud: payload.clientId || 'first-party',
        jti,
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn,
        keyid: this.keyId,
      },
    );

    return {
      token,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      jti,
    };
  }

  signIdToken(payload: IdTokenPayload) {
    const jti = randomUUID();
    const expiresIn = this.accessTokenTtl;
    const token = sign(
      {
        sub: payload.sub,
        aud: payload.clientId || 'first-party',
        iss: this.issuer,
        jti,
        name: payload.fullName || undefined,
        email: payload.email || undefined,
        email_verified: payload.emailVerified ?? undefined,
        phone_number: payload.phone || undefined,
        phone_number_verified: payload.phoneVerified ?? undefined,
        account_type: payload.accountType,
        session_id: payload.sessionId,
        scope: payload.scope,
        updated_at: new Date().toISOString(),
      },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn,
        keyid: this.keyId,
      },
    );

    return {
      token,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      jti,
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      return verify(token, this.publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
      }) as AccessTokenPayload;
    } catch (error) {
      return null;
    }
  }

  signAdminToken(payload: { adminId: string; email: string; role: string }) {
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

    return {
      token,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      jti,
    };
  }

  verifyAdminToken(token: string): AdminTokenPayload | null {
    try {
      return verify(token, this.publicKey, {
        algorithms: ['RS256'],
        audience: 'admin',
      }) as AdminTokenPayload;
    } catch (error) {
      Logger.error(`Token verification failed: ${error.message} - token: ${token.substring(0, 20)}...`, error.stack, JwtService.name);
      return null;
    }
  }

  getJwks() {
    const keyObject = createPublicKey(this.publicKey);
    const jwk = keyObject.export({ format: 'jwk' }) as Record<string, string>;

    return {
      keys: [
        {
          ...jwk,
          kid: this.keyId,
          alg: 'RS256',
          use: 'sig',
        },
      ],
    };
  }

  getOpenIdConfiguration() {
    return {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/authorize`,
      token_endpoint: `${this.issuer}/token`,
      jwks_uri: `${this.issuer}/.well-known/jwks.json`,
      response_types_supported: ['code', 'token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
      ],
      claims_supported: [
        'sub',
        'name',
        'given_name',
        'family_name',
        'email',
        'email_verified',
        'phone_number',
        'phone_number_verified',
        'updated_at',
      ],
      grant_types_supported: [
        'authorization_code',
        'refresh_token',
        'password',
        'client_credentials',
      ],
      code_challenge_methods_supported: ['S256'],
    };
  }
}


