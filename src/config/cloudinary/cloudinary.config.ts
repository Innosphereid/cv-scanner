import { registerAs } from '@nestjs/config';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  secure: boolean;
  apiBaseUrl?: string;
  retryAttempts: number;
  retryDelayMs: number;
  failFast: boolean;
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(v)) return false;
  }
  return defaultValue;
}

export const cloudinaryConfig = registerAs(
  'cloudinary',
  (): CloudinaryConfig => ({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    secure: parseBoolean(process.env.CLOUDINARY_SECURE, true),
    apiBaseUrl: process.env.CLOUDINARY_API_BASE_URL,
    retryAttempts: Number(process.env.CLOUDINARY_RETRY_ATTEMPTS ?? 2),
    retryDelayMs: Number(process.env.CLOUDINARY_RETRY_DELAY_MS ?? 500),
    failFast: parseBoolean(process.env.CLOUDINARY_FAIL_FAST, true),
  }),
);
