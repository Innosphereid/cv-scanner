import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface RateLimitConfig {
  // General rate limits
  general: {
    ttl: number; // Time window in seconds
    limit: number; // Max requests per time window
  };

  // Stricter limits for sensitive endpoints
  sensitive: {
    ttl: number;
    limit: number;
  };

  // Login endpoint limits (most strict)
  login: {
    ttl: number;
    limit: number;
  };

  // Upload file limits
  upload: {
    ttl: number;
    limit: number;
  };
}

export const rateLimiterConfig = registerAs(
  'rateLimiter',
  (): RateLimitConfig => {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      return {
        general: {
          ttl: 60, // 1 minute
          limit: 100, // 100 requests per minute
        },
        sensitive: {
          ttl: 60,
          limit: 30, // 30 requests per minute
        },
        login: {
          ttl: 300, // 5 minutes
          limit: 5, // 5 login attempts per 5 minutes
        },
        upload: {
          ttl: 3600, // 1 hour
          limit: 20, // 20 uploads per hour
        },
      };
    }

    // Production - more restrictive
    return {
      general: {
        ttl: 60,
        limit: 60, // 60 requests per minute
      },
      sensitive: {
        ttl: 60,
        limit: 20, // 20 requests per minute
      },
      login: {
        ttl: 900, // 15 minutes
        limit: 3, // 3 login attempts per 15 minutes
      },
      upload: {
        ttl: 3600, // 1 hour
        limit: 10, // 10 uploads per hour
      },
    };
  },
);

export const rateLimiterConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
});
