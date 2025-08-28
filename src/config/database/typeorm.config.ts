import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { TypeOrmWinstonLogger } from './typeorm-winston.logger';
import { DatabaseConfig } from './database.config';

export function buildTypeOrmOptions(db: DatabaseConfig): TypeOrmModuleOptions {
  const sslOptions = db.ssl
    ? {
        ssl: {
          rejectUnauthorized: db.rejectUnauthorized,
        },
      }
    : {};

  const isTsNode = !!process.env.TS_NODE;
  const isDev = process.env.NODE_ENV !== 'production';

  const migrationsPaths =
    isTsNode || isDev
      ? [join(process.cwd(), 'src/migrations/*{.ts,.js}')]
      : [join(__dirname, '../../migrations/*{.js}')];

  const base: DataSourceOptions = {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.user,
    password: db.password,
    database: db.name,
    schema: db.schema,
    synchronize: false,
    logging: db.logging
      ? ['error', 'warn', 'schema', 'migration', 'query']
      : false,
    logger: db.logging ? new TypeOrmWinstonLogger() : 'advanced-console',
    migrationsTableName: 'migrations',
    migrationsRun: false,
    entities: [join(__dirname, '../../**/*.entity{.ts,.js}')],
    migrations: migrationsPaths,
    extra: {
      max: db.maxConnections,
      idleTimeoutMillis: db.idleTimeout,
      connectionTimeoutMillis: db.connectionTimeout,
    },
    ...sslOptions,
  } as DataSourceOptions;

  return base as TypeOrmModuleOptions;
}
