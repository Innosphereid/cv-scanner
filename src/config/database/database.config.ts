import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  schema: string;
  ssl: boolean;
  rejectUnauthorized: boolean;
  maxConnections: number;
  idleTimeout: number; // ms
  connectionTimeout: number; // ms
  logging: boolean;
}

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    name: process.env.DB_NAME ?? 'app_db',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    schema: process.env.DB_SCHEMA ?? 'public',
    ssl: parseBoolean(process.env.DB_SSL, false),
    rejectUnauthorized: parseBoolean(process.env.DB_REJECT_UNAUTHORIZED, true),
    maxConnections: Number(process.env.DB_MAX_CONNECTIONS ?? 10),
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT ?? 10000),
    connectionTimeout: Number(process.env.DB_CONN_TIMEOUT ?? 10000),
    logging: parseBoolean(process.env.DB_LOGGING, false),
  }),
);

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
