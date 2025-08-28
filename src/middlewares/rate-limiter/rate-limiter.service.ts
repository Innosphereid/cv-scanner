import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RateLimitConfig } from '../../config/rate-limiter/rate-limiter.config';

export interface RateLimitResult {
  isAllowed: boolean;
  currentCount: number;
  limit: number;
  ttl: number;
  remainingTime: number;
  resetTime: Date;
}

export interface RateLimitOptions {
  type: 'general' | 'sensitive' | 'login' | 'upload';
  identifier: string; // Usually IP address
  customTtl?: number;
  customLimit?: number;
}

@Injectable()
export class RateLimiterService implements OnModuleInit {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly config: RateLimitConfig;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    // Get configuration with fallback to default values
    const configFromService =
      this.configService.get<RateLimitConfig>('rateLimiter');

    if (!configFromService) {
      this.logger.warn(
        'Rate limiter configuration not found, using default configuration',
      );
      this.config = this.getDefaultConfig();
    } else {
      this.config = configFromService;
    }
  }

  onModuleInit() {
    // Validate configuration on startup
    this.validateConfiguration();
    this.logger.log('Rate limiter service initialized with configuration', {
      environment: process.env.NODE_ENV || 'development',
      config: this.config,
    });
  }

  /**
   * Get default configuration as fallback
   */
  private getDefaultConfig(): RateLimitConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      return {
        general: { ttl: 60, limit: 100 },
        sensitive: { ttl: 60, limit: 30 },
        login: { ttl: 300, limit: 5 },
        upload: { ttl: 3600, limit: 20 },
      };
    }

    // Production defaults
    return {
      general: { ttl: 60, limit: 60 },
      sensitive: { ttl: 60, limit: 20 },
      login: { ttl: 900, limit: 3 },
      upload: { ttl: 3600, limit: 10 },
    };
  }

  /**
   * Validate configuration structure
   */
  private validateConfiguration(): void {
    const requiredTypes = ['general', 'sensitive', 'login', 'upload'] as const;

    for (const type of requiredTypes) {
      if (
        !this.config[type] ||
        typeof this.config[type].ttl !== 'number' ||
        typeof this.config[type].limit !== 'number'
      ) {
        this.logger.error(
          `Invalid configuration for ${type} rate limiting`,
          this.config[type],
        );
        throw new Error(`Invalid rate limiter configuration for ${type}`);
      }

      if (this.config[type].ttl <= 0 || this.config[type].limit <= 0) {
        this.logger.error(
          `Invalid values for ${type} rate limiting: ttl=${this.config[type].ttl}, limit=${this.config[type].limit}`,
        );
        throw new Error(`Invalid rate limiter values for ${type}`);
      }
    }

    this.logger.log('Rate limiter configuration validation passed');
  }

  /**
   * Check if request is allowed based on rate limiting rules
   */
  async checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    const { type, identifier, customTtl, customLimit } = options;

    // Get configuration for the specified type
    const config = this.getConfigForType(type);
    const ttl = customTtl || config.ttl;
    const limit = customLimit || config.limit;

    // Generate Redis key
    const key = this.generateKey(type, identifier);

    try {
      // Get current count
      let currentCount = await this.redisService.get(key);

      if (currentCount === null) {
        // First request, set initial count
        currentCount = 1;
        await this.redisService.set(key, currentCount, ttl);
      } else {
        // Increment existing count
        currentCount = await this.redisService.increment(key, ttl);
      }

      // Check if limit exceeded
      const isAllowed = currentCount <= limit;

      // Get remaining time
      const remainingTime = await this.redisService.getTtl(key);
      const resetTime = new Date(Date.now() + remainingTime * 1000);

      // Log rate limit check
      this.logRateLimitCheck(options, currentCount, limit, isAllowed);

      return {
        isAllowed,
        currentCount,
        limit,
        ttl,
        remainingTime,
        resetTime,
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed for ${identifier}`, error);

      // In case of Redis error, allow the request but log it
      return {
        isAllowed: true,
        currentCount: 0,
        limit,
        ttl,
        remainingTime: 0,
        resetTime: new Date(),
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetRateLimit(type: string, identifier: string): Promise<void> {
    const key = this.generateKey(type, identifier);
    await this.redisService.delete(key);
    this.logger.log(`Rate limit reset for ${type}:${identifier}`);
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    options: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const { type, identifier, customTtl, customLimit } = options;

    const config = this.getConfigForType(type);
    const ttl = customTtl || config.ttl;
    const limit = customLimit || config.limit;

    const key = this.generateKey(type, identifier);

    try {
      const currentCount = (await this.redisService.get(key)) || 0;
      const remainingTime = await this.redisService.getTtl(key);
      const resetTime = new Date(Date.now() + remainingTime * 1000);

      return {
        isAllowed: currentCount < limit,
        currentCount,
        limit,
        ttl,
        remainingTime,
        resetTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get rate limit status for ${identifier}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get configuration for specific rate limit type
   */
  private getConfigForType(type: string) {
    switch (type) {
      case 'login':
        return this.config.login;
      case 'sensitive':
        return this.config.sensitive;
      case 'upload':
        return this.config.upload;
      case 'general':
      default:
        return this.config.general;
    }
  }

  /**
   * Generate Redis key for rate limiting
   */
  private generateKey(type: string, identifier: string): string {
    return `rate-limit:${type}:${identifier}`;
  }

  /**
   * Log rate limit check for monitoring
   */
  private logRateLimitCheck(
    options: RateLimitOptions,
    currentCount: number,
    limit: number,
    isAllowed: boolean,
  ): void {
    const { type, identifier } = options;

    if (!isAllowed) {
      this.logger.warn(
        `Rate limit exceeded for ${type}:${identifier} - ${currentCount}/${limit} requests`,
        {
          type,
          identifier,
          currentCount,
          limit,
          timestamp: new Date().toISOString(),
        },
      );
    } else if (currentCount > limit * 0.8) {
      // Log when approaching limit (80% threshold)
      this.logger.log(
        `Rate limit warning for ${type}:${identifier} - ${currentCount}/${limit} requests`,
        {
          type,
          identifier,
          currentCount,
          limit,
          threshold: '80%',
          timestamp: new Date().toISOString(),
        },
      );
    }
  }

  /**
   * Get all rate limit configurations
   */
  getConfigurations(): RateLimitConfig {
    return this.config;
  }

  /**
   * Check if Redis is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redisService.getClient().ping();
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }
}
