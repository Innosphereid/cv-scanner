import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { Logger } from '../../utils/logger';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger();

  constructor(private readonly configService: ConfigService) {
    const redisConfig = this.configService.get('redis');

    if (!redisConfig) {
      throw new Error('Redis configuration not found');
    }

    // Create Redis options with only valid properties
    const redisOptions: RedisOptions = {
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      lazyConnect: redisConfig.lazyConnect,
      keepAlive: redisConfig.keepAlive,
      family: redisConfig.family,
      connectTimeout: redisConfig.connectTimeout,
      commandTimeout: redisConfig.commandTimeout,
      enableOfflineQueue: redisConfig.enableOfflineQueue,
    };

    this.redis = new Redis(redisOptions);

    // Event listeners
    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', error => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Redis connection error', errorMessage);
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis is ready to accept commands');
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  async onModuleInit() {
    try {
      // Test connection
      await this.redis.ping();
      this.logger.log('Redis connection test successful');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Redis connection test failed', errorMessage);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    }
  }

  getClient(): Redis {
    return this.redis;
  }

  async increment(key: string, ttl: number): Promise<number> {
    try {
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, ttl);

      const results = await multi.exec();

      if (!results) {
        throw new Error('Redis multi-exec failed - no results returned');
      }

      const firstResult = results[0];
      if (!firstResult || firstResult[0]) {
        // firstResult[0] contains error if any
        throw new Error(
          `Redis increment failed: ${firstResult[0]?.message || 'Unknown error'}`,
        );
      }

      return firstResult[1] as number;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to increment key: ${key}`, errorMessage);
      throw error;
    }
  }

  async get(key: string): Promise<number | null> {
    try {
      const value = await this.redis.get(key);
      return value ? parseInt(value, 10) : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get key: ${key}`, errorMessage);
      throw error;
    }
  }

  async set(key: string, value: number, ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, value.toString());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to set key: ${key}`, errorMessage);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete key: ${key}`, errorMessage);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to check existence of key: ${key}`,
        errorMessage,
      );
      throw error;
    }
  }

  async getTtl(key: string): Promise<number> {
    try {
      const ttl = await this.redis.ttl(key);
      return ttl;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get TTL for key: ${key}`, errorMessage);
      throw error;
    }
  }
}
