import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimitInterceptor } from './rate-limit.interceptor';
import { RateLimiterController } from './rate-limiter.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [RateLimiterController],
  providers: [RedisService, RateLimiterService, RateLimitInterceptor],
  exports: [RedisService, RateLimiterService, RateLimitInterceptor],
})
export class RateLimiterModule {}
