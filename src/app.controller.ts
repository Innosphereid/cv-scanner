import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { Logger } from './utils/logger';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: Logger,
  ) {}

  @Get()
  getHello(): string {
    this.logger.info('GET / endpoint accessed');
    return this.appService.getHello();
  }

  @Get('error')
  getError(): string {
    this.logger.warn('Error endpoint accessed - this will throw an error');
    try {
      return this.appService.getError();
    } catch (error) {
      const err = error as Error;
      this.logger.error('Error endpoint failed', err.stack, 'AppController');
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('debug')
  getDebug(): string {
    this.logger.debug('Debug endpoint accessed');
    return this.appService.getDebug();
  }

  @Get('debug-sentry')
  getSentryError() {
    this.logger.warn(
      'Sentry debug endpoint accessed - this will throw an error for Sentry testing',
    );
    throw new Error('My first Sentry error!');
  }

  @Get('metadata')
  getMetadata(): any {
    const metadata = {
      requestId: `req-${Date.now()}`,
      userId: 'demo-user',
      action: 'get_metadata',
      timestamp: new Date().toISOString(),
    };

    this.logger.info(
      'Metadata endpoint accessed with custom metadata',
      metadata,
    );

    return {
      message: 'Metadata logged successfully',
      metadata,
    };
  }
}
