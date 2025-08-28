import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { databaseConfig } from './database/database.config';
import { authConfig } from './auth/auth.config';
import { mailerConfig } from './mailer/mailer.config';
import { redisConfig, redisConfigValidationSchema } from './redis/redis.config';
import {
  rateLimiterConfig,
  rateLimiterConfigValidationSchema,
} from './rate-limiter/rate-limiter.config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.NODE_ENV === 'test'
          ? '.env.test'
          : process.env.NODE_ENV === 'development'
            ? '.env.development'
            : '.env',
      ],
      load: [
        databaseConfig,
        redisConfig,
        rateLimiterConfig,
        authConfig,
        mailerConfig,
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3000),

        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().required(),
        DB_NAME: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').required(),
        DB_SCHEMA: Joi.string().default('public'),
        DB_SSL: Joi.boolean()
          .truthy('true', '1')
          .falsy('false', '0')
          .default(false),
        DB_MAX_CONNECTIONS: Joi.number().integer().min(1).default(10),
        DB_IDLE_TIMEOUT: Joi.number().integer().min(1000).default(10000),
        DB_CONN_TIMEOUT: Joi.number().integer().min(1000).default(10000),
        DB_LOGGING: Joi.boolean()
          .truthy('true', '1')
          .falsy('false', '0')
          .default(false),
        DB_REJECT_UNAUTHORIZED: Joi.boolean()
          .truthy('true', '1')
          .falsy('false', '0')
          .default(true),

        // Redis Configuration
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().port().default(6379),
        REDIS_PASSWORD: Joi.string().optional(),
        REDIS_DB: Joi.number().integer().min(0).max(15).default(0),
        REDIS_KEY_PREFIX: Joi.string().default('cv-scanner:'),
        REDIS_RETRY_DELAY_ON_FAILOVER: Joi.number()
          .integer()
          .min(100)
          .default(100),
        REDIS_MAX_RETRIES_PER_REQUEST: Joi.number().integer().min(1).default(3),

        // Cloudinary
        CLOUDINARY_CLOUD_NAME: Joi.string().required(),
        CLOUDINARY_API_KEY: Joi.string().required(),
        CLOUDINARY_API_SECRET: Joi.string().required(),
        CLOUDINARY_SECURE: Joi.boolean()
          .truthy('true', '1', 'yes', 'on')
          .falsy('false', '0', 'no', 'off')
          .default(true),
        CLOUDINARY_API_BASE_URL: Joi.string().uri().optional(),
        CLOUDINARY_RETRY_ATTEMPTS: Joi.number().integer().min(0).default(2),
        CLOUDINARY_RETRY_DELAY_MS: Joi.number().integer().min(0).default(500),
        CLOUDINARY_FAIL_FAST: Joi.boolean()
          .truthy('true', '1', 'yes', 'on')
          .falsy('false', '0', 'no', 'off')
          .default(true),

        // Auth
        AUTH_BCRYPT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),
        AUTH_JWT_SECRET: Joi.string().required(),
        AUTH_JWT_TTL: Joi.string().default('15m'),
        AUTH_COOKIE_DOMAIN: Joi.string().optional(),
        APP_BASE_URL: Joi.string().uri().required(),

        // Mailer (Mailtrap)
        MAILTRAP_HOST: Joi.string().required(),
        MAILTRAP_PORT: Joi.number().port().required(),
        MAILTRAP_USER: Joi.string().required(),
        MAILTRAP_PASS: Joi.string().required(),
        MAIL_FROM_EMAIL: Joi.string().email().default('no-reply@example.com'),
        MAIL_FROM_NAME: Joi.string().default('CV Scanner'),
      })
        .concat(redisConfigValidationSchema)
        .concat(rateLimiterConfigValidationSchema),
    }),
  ],
})
export class AppConfigModule {}
