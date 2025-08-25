import { Injectable } from '@nestjs/common';
import { Logger } from './utils/logger';

@Injectable()
export class AppService {
  constructor(private readonly logger: Logger) {}

  getHello(): string {
    this.logger.info('Hello endpoint called');
    return 'Hello World!';
  }

  getError(): string {
    try {
      throw new Error('This is a test error');
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        'Error occurred in getError method',
        err.stack,
        'AppService',
      );
      throw error;
    }
  }

  getDebug(): string {
    this.logger.debug('Debug information for developers');
    this.logger.verbose('Verbose logging in development mode');
    return 'Debug info logged';
  }
}
