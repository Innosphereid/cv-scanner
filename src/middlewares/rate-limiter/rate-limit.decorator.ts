import { SetMetadata } from '@nestjs/common';
import { RateLimitResult } from './rate-limiter.service';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitMetadata {
  type: 'general' | 'sensitive' | 'login' | 'upload';
  customTtl?: number;
  customLimit?: number;
  description?: string;
}

/**
 * Extended rate limit result that includes type information
 */
export interface ExtendedRateLimitResult extends RateLimitResult {
  type: string;
}

/**
 * Decorator untuk mengaktifkan rate limiting pada method atau controller
 *
 * @param options Konfigurasi rate limiting
 * @returns Decorator function
 *
 * @example
 * ```typescript
 * @RateLimit({ type: 'login' })
 * async login() { ... }
 *
 * @RateLimit({ type: 'sensitive', customLimit: 50 })
 * async sensitiveEndpoint() { ... }
 * ```
 */
export const RateLimit = (options: RateLimitMetadata) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Decorator untuk endpoint login dengan rate limiting ketat
 */
export const RateLimitLogin = () =>
  RateLimit({
    type: 'login',
    description: 'Strict rate limiting for login attempts',
  });

/**
 * Decorator untuk endpoint sensitif dengan rate limiting sedang
 */
export const RateLimitSensitive = () =>
  RateLimit({
    type: 'sensitive',
    description: 'Moderate rate limiting for sensitive operations',
  });

/**
 * Decorator untuk endpoint upload file
 */
export const RateLimitUpload = () =>
  RateLimit({ type: 'upload', description: 'Rate limiting for file uploads' });

/**
 * Decorator untuk endpoint umum dengan rate limiting longgar
 */
export const RateLimitGeneral = () =>
  RateLimit({
    type: 'general',
    description: 'General rate limiting for regular endpoints',
  });

/**
 * Decorator untuk custom rate limiting
 */
export const RateLimitCustom = (
  ttl: number,
  limit: number,
  description?: string,
) =>
  RateLimit({
    type: 'general',
    customTtl: ttl,
    customLimit: limit,
    description:
      description ||
      `Custom rate limiting: ${limit} requests per ${ttl} seconds`,
  });
