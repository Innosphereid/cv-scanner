import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Logger } from '../../utils/logger';

@Injectable()
export class DatabaseConnectionLogger implements OnApplicationBootstrap {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      // If for some reason it's not initialized yet, wait for it
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      this.logger.info('Database connect successfully');
    } catch (error) {
      this.logger.error(
        'Database connection failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
