import { buildTypeOrmOptions } from './typeorm.config';
import { type PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { type DatabaseConfig } from './database.config';

describe('buildTypeOrmOptions', () => {
  const base: DatabaseConfig = {
    host: 'localhost',
    port: 5432,
    name: 'db',
    user: 'postgres',
    password: 'pw',
    schema: 'public',
    ssl: false,
    rejectUnauthorized: true,
    maxConnections: 10,
    idleTimeout: 10000,
    connectionTimeout: 10000,
    logging: false,
  };

  it('maps DatabaseConfig to TypeORM options correctly (non-SSL)', () => {
    const opts = buildTypeOrmOptions({ ...base, logging: true }) as unknown as PostgresConnectionOptions & {
      extra: { max: number; idleTimeoutMillis: number; connectionTimeoutMillis: number };
    };
    expect(opts.type).toBe('postgres');
    expect(opts.host).toBe(base.host);
    expect(opts.port).toBe(base.port);
    expect(opts.username).toBe(base.user);
    expect(opts.password).toBe(base.password);
    expect(opts.database).toBe(base.name);
    expect(opts.schema).toBe(base.schema);
    expect(opts.synchronize).toBe(false);
    expect(opts.logging).not.toBe(false);
    const extra = opts.extra as { max: number; idleTimeoutMillis: number; connectionTimeoutMillis: number };
    expect(extra.max).toBe(base.maxConnections);
    expect(extra.idleTimeoutMillis).toBe(base.idleTimeout);
    expect(extra.connectionTimeoutMillis).toBe(base.connectionTimeout);
  });

  it('includes SSL config when enabled', () => {
    const opts = buildTypeOrmOptions({ ...base, ssl: true, rejectUnauthorized: false }) as unknown as PostgresConnectionOptions & {
      ssl: { rejectUnauthorized: boolean };
    };
    expect(opts.ssl).toEqual({ rejectUnauthorized: false });
  });
});


