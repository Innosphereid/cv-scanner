import { databaseConfig, type DatabaseConfig } from './database.config';

function withEnv<T>(env: NodeJS.ProcessEnv, fn: () => T): T {
  const prev = process.env;
  try {
    process.env = { ...prev, ...env };
    return fn();
  } finally {
    process.env = prev;
  }
}

describe('databaseConfig', () => {
  it('parses full environment variables correctly', () => {
    const cfg = withEnv(
      {
        DB_HOST: 'db.local',
        DB_PORT: '6543',
        DB_NAME: 'mydb',
        DB_USER: 'user1',
        DB_PASSWORD: 'secret',
        DB_SCHEMA: 'custom',
        DB_SSL: 'true',
        DB_REJECT_UNAUTHORIZED: 'false',
        DB_MAX_CONNECTIONS: '20',
        DB_IDLE_TIMEOUT: '15000',
        DB_CONN_TIMEOUT: '12000',
        DB_LOGGING: '1',
      },
      () => databaseConfig() as unknown as DatabaseConfig,
    );

    expect(cfg).toEqual(
      expect.objectContaining({
        host: 'db.local',
        port: 6543,
        name: 'mydb',
        user: 'user1',
        password: 'secret',
        schema: 'custom',
        ssl: true,
        rejectUnauthorized: false,
        maxConnections: 20,
        idleTimeout: 15000,
        connectionTimeout: 12000,
        logging: true,
      }),
    );
  });

  it('applies sensible defaults when envs are missing', () => {
    const cfg = withEnv({}, () => databaseConfig() as unknown as DatabaseConfig);

    expect(cfg.host).toBe('localhost');
    expect(cfg.port).toBe(5432);
    expect(cfg.name).toBe('app_db');
    expect(cfg.user).toBe('postgres');
    expect(cfg.password).toBe('');
    expect(cfg.schema).toBe('public');
    expect(cfg.ssl).toBe(false);
    expect(cfg.rejectUnauthorized).toBe(true);
    expect(cfg.maxConnections).toBe(10);
    expect(cfg.idleTimeout).toBe(10000);
    expect(cfg.connectionTimeout).toBe(10000);
    expect(cfg.logging).toBe(false);
  });

  it('interprets boolean-like strings for flags', () => {
    const cfgTrue = withEnv(
      { DB_SSL: '1', DB_LOGGING: 'true', DB_REJECT_UNAUTHORIZED: '1' },
      () => databaseConfig() as unknown as DatabaseConfig,
    );
    expect(cfgTrue.ssl).toBe(true);
    expect(cfgTrue.logging).toBe(true);
    expect(cfgTrue.rejectUnauthorized).toBe(true);

    const cfgFalse = withEnv(
      { DB_SSL: '0', DB_LOGGING: 'false', DB_REJECT_UNAUTHORIZED: '0' },
      () => databaseConfig() as unknown as DatabaseConfig,
    );
    expect(cfgFalse.ssl).toBe(false);
    expect(cfgFalse.logging).toBe(false);
    expect(cfgFalse.rejectUnauthorized).toBe(false);
  });
});


