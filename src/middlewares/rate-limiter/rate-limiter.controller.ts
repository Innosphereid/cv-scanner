import {
  Controller,
  Get,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  UseInterceptors,
  Query,
  Param,
} from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import {
  RateLimit,
  RateLimitLogin,
  RateLimitSensitive,
  RateLimitUpload,
} from './rate-limit.decorator';
import { RateLimitInterceptor } from './rate-limit.interceptor';

@Controller('rate-limit')
@UseInterceptors(RateLimitInterceptor)
export class RateLimiterController {
  private readonly logger = new Logger(RateLimiterController.name);

  constructor(private readonly rateLimiterService: RateLimiterService) {}

  /**
   * Test endpoint dengan rate limiting umum
   */
  @Get('test/general')
  @RateLimit({ type: 'general' })
  async testGeneralRateLimit() {
    this.logger.log('General rate limit test endpoint accessed');
    return {
      message: 'General rate limit test successful',
      timestamp: new Date().toISOString(),
      type: 'general',
    };
  }

  /**
   * Test endpoint dengan rate limiting sensitif
   */
  @Get('test/sensitive')
  @RateLimit({ type: 'sensitive' })
  async testSensitiveRateLimit() {
    this.logger.log('Sensitive rate limit test endpoint accessed');
    return {
      message: 'Sensitive rate limit test successful',
      timestamp: new Date().toISOString(),
      type: 'sensitive',
    };
  }

  /**
   * Test endpoint dengan rate limiting login (paling ketat)
   */
  @Post('test/login')
  @HttpCode(HttpStatus.OK)
  @RateLimitLogin()
  async testLoginRateLimit() {
    this.logger.log('Login rate limit test endpoint accessed');
    return {
      message: 'Login rate limit test successful',
      timestamp: new Date().toISOString(),
      type: 'login',
    };
  }

  /**
   * Test endpoint dengan rate limiting upload
   */
  @Post('test/upload')
  @HttpCode(HttpStatus.OK)
  @RateLimitUpload()
  async testUploadRateLimit() {
    this.logger.log('Upload rate limit test endpoint accessed');
    return {
      message: 'Upload rate limit test successful',
      timestamp: new Date().toISOString(),
      type: 'upload',
    };
  }

  /**
   * Test endpoint dengan custom rate limiting
   */
  @Get('test/custom')
  @RateLimit({ type: 'general', customTtl: 30, customLimit: 5 })
  async testCustomRateLimit() {
    this.logger.log('Custom rate limit test endpoint accessed');
    return {
      message: 'Custom rate limit test successful (5 requests per 30 seconds)',
      timestamp: new Date().toISOString(),
      type: 'custom',
      customTtl: 30,
      customLimit: 5,
    };
  }

  /**
   * Get current rate limit status untuk IP tertentu
   */
  @Get('status/:type/:identifier')
  async getRateLimitStatus(
    @Param('type') type: string,
    @Param('identifier') identifier: string,
  ) {
    try {
      const status = await this.rateLimiterService.getRateLimitStatus({
        type: type as any,
        identifier,
      });

      return {
        type,
        identifier,
        status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get rate limit status for ${type}:${identifier}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Reset rate limit untuk IP tertentu
   */
  @Delete('reset/:type/:identifier')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetRateLimit(
    @Param('type') type: string,
    @Param('identifier') identifier: string,
  ) {
    try {
      await this.rateLimiterService.resetRateLimit(type, identifier);
      this.logger.log(`Rate limit reset for ${type}:${identifier}`);
      return;
    } catch (error) {
      this.logger.error(
        `Failed to reset rate limit for ${type}:${identifier}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get semua konfigurasi rate limiter
   */
  @Get('config')
  async getRateLimitConfig() {
    const config = this.rateLimiterService.getConfigurations();
    return {
      configurations: config,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Health check untuk Redis
   */
  @Get('health')
  async getHealth() {
    try {
      const isHealthy = await this.rateLimiterService.isHealthy();
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        redis: isHealthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        redis: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
