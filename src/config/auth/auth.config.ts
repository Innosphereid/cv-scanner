import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  bcryptRounds: number;
  jwtSecret: string;
  jwtTtl: string;
  cookieDomain?: string;
  appBaseUrl: string;
}

export const authConfig = registerAs(
  'auth',
  (): AuthConfig => ({
    bcryptRounds: parseInt(process.env.AUTH_BCRYPT_ROUNDS || '12', 10),
    jwtSecret: process.env.AUTH_JWT_SECRET || 'changeme',
    jwtTtl: process.env.AUTH_JWT_TTL || '15m',
    cookieDomain: process.env.AUTH_COOKIE_DOMAIN,
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  }),
);
