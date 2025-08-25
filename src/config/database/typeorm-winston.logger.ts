import { Logger as TypeOrmLogger } from 'typeorm';
import { logger } from '../../utils/logger';

export class TypeOrmWinstonLogger implements TypeOrmLogger {
  logQuery(query: string, parameters?: unknown[]): void {
    logger.debug(`[TypeORM] QUERY: ${query}`, undefined, { parameters });
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: unknown[],
  ): void {
    const message = `[TypeORM] QUERY ERROR: ${query}`;
    if (error instanceof Error) {
      logger.error(message, error.stack);
    } else {
      logger.error(`${message} - ${error}`);
    }
    if (parameters && parameters.length > 0) {
      logger.debug('[TypeORM] QUERY PARAMS', undefined, { parameters });
    }
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]): void {
    logger.warn(
      `[TypeORM] SLOW QUERY (${time} ms): ${query} params=${JSON.stringify(
        parameters ?? [],
      )}`,
    );
  }

  logSchemaBuild(message: string): void {
    logger.debug(`[TypeORM] SCHEMA: ${message}`);
  }

  logMigration(message: string): void {
    logger.info(`[TypeORM] MIGRATION: ${message}`);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    const text =
      typeof message === 'string' ? message : JSON.stringify(message);
    if (level === 'log' || level === 'info') {
      logger.info(`[TypeORM] ${text}`);
    } else if (level === 'warn') {
      logger.warn(`[TypeORM] ${text}`);
    }
  }
}
