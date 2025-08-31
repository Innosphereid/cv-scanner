import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';
import * as fs from 'fs';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: resolveRedisPassword(),
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'cv-scanner:',
  retryDelayOnFailover: parseInt(
    process.env.REDIS_RETRY_DELAY_ON_FAILOVER || '100',
    10,
  ),
  maxRetriesPerRequest: parseInt(
    process.env.REDIS_MAX_RETRIES_PER_REQUEST || '3',
    10,
  ),
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: false,
  maxLoadingTimeout: 10000,
}));

export const redisConfigValidationSchema = Joi.object({
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_PASSWORD_FILE: Joi.string().optional(),
  REDIS_DB: Joi.number().integer().min(0).max(15).default(0),
  REDIS_KEY_PREFIX: Joi.string().default('cv-scanner:'),
  REDIS_RETRY_DELAY_ON_FAILOVER: Joi.number().integer().min(100).default(100),
  REDIS_MAX_RETRIES_PER_REQUEST: Joi.number().integer().min(1).default(3),
});

function resolveRedisPassword(): string | undefined {
  const envPass = process.env.REDIS_PASSWORD;
  if (envPass && envPass.length > 0) return envPass;
  const file = process.env.REDIS_PASSWORD_FILE;
  if (file && fs.existsSync(file)) {
    try {
      const val = fs.readFileSync(file, 'utf8').trim();
      return val.length > 0 ? val : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}
