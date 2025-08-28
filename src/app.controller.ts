import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Logger } from './utils/logger';
import {
  RateLimit,
  RateLimitGeneral,
  RateLimitSensitive,
} from './middlewares/rate-limiter';
import { RateLimitInterceptor } from './middlewares/rate-limiter';

@Controller()
@UseInterceptors(RateLimitInterceptor)
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: Logger,
  ) {}

  @Get()
  @RateLimitGeneral()
  getHello(): string {
    this.logger.info('GET / endpoint accessed');
    return this.appService.getHello();
  }

  @Get('error')
  @RateLimit({ type: 'sensitive' })
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
  @RateLimitGeneral()
  getDebug(): string {
    this.logger.debug('Debug endpoint accessed');
    return this.appService.getDebug();
  }

  @Get('metadata')
  @RateLimitSensitive()
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
