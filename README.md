# CV Scanner API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>

<p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
</p>

## Description

CV Scanner API is a backend application built using [NestJS](https://github.com/nestjs/nest) framework for processing and analyzing CV (Curriculum Vitae) documents. This application is equipped with advanced rate limiting features to prevent DDoS attacks and ensure optimal performance.

## Main Features

- **CV Processing**: Analysis and processing of CV documents
- **Advanced Rate Limiting**: Modular and scalable rate limiting middleware
- **Redis Integration**: High-performance storage using Redis
- **Environment-based Configuration**: Different configurations for development and production
- **Comprehensive Logging**: Logging for monitoring and debugging
- **Health Checks**: Endpoints for system health monitoring
- **Docker Support**: Containerization for easy deployment

## Rate Limiter Middleware

A modular, flexible, maintainable, and reliable rate limiter middleware to prevent DDoS attacks on the CV Scanner application.

### Rate Limiter Features

- **Multiple Rate Limit Types**: General, sensitive, login, and upload with different limits
- **Redis-based Storage**: Using Redis for scalable storage
- **IP-based Limiting**: Rate limiting based on IP address
- **Custom Rate Limits**: Ability to set custom TTL and limits
- **Comprehensive Logging**: Logging for monitoring and debugging
- **Health Checks**: Endpoints for Redis health monitoring
- **Easy Integration**: Decorator-based approach for ease of use

### Rate Limit Types

#### 1. General

- **Development**: 100 requests per minute
- **Production**: 60 requests per minute
- **Use Case**: General endpoints that are not sensitive

#### 2. Sensitive

- **Development**: 30 requests per minute
- **Production**: 20 requests per minute
- **Use Case**: Endpoints that require higher security

#### 3. Login

- **Development**: 5 attempts per 5 minutes
- **Production**: 3 attempts per 15 minutes
- **Use Case**: Login and authentication endpoints

#### 4. Upload

- **Development**: 20 uploads per hour
- **Production**: 10 uploads per hour
- **Use Case**: File and document uploads

### Usage

#### Basic Usage with Decorators

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import {
  RateLimit,
  RateLimitGeneral,
  RateLimitSensitive,
  RateLimitLogin,
  RateLimitUpload,
} from './middlewares/rate-limiter';
import { RateLimitInterceptor } from './middlewares/rate-limiter';

@Controller('api')
@UseInterceptors(RateLimitInterceptor)
export class ApiController {
  // General rate limiting
  @Get('public')
  @RateLimitGeneral()
  getPublicData() {
    return { message: 'Public data' };
  }

  // Sensitive rate limiting
  @Get('sensitive')
  @RateLimitSensitive()
  getSensitiveData() {
    return { message: 'Sensitive data' };
  }

  // Login rate limiting (strictest)
  @Post('login')
  @RateLimitLogin()
  login() {
    return { message: 'Login successful' };
  }

  // Upload rate limiting
  @Post('upload')
  @RateLimitUpload()
  uploadFile() {
    return { message: 'File uploaded' };
  }

  // Custom rate limiting
  @Get('custom')
  @RateLimit({
    type: 'general',
    customTtl: 30,
    customLimit: 5,
  })
  getCustomLimitedData() {
    return { message: 'Custom limited data' };
  }
}
```

#### Manual Rate Limiting

```typescript
import { Injectable } from '@nestjs/common';
import { RateLimiterService } from './middlewares/rate-limiter';

@Injectable()
export class CustomService {
  constructor(private readonly rateLimiterService: RateLimiterService) {}

  async checkCustomRateLimit(ip: string) {
    const result = await this.rateLimiterService.checkRateLimit({
      type: 'general',
      identifier: ip,
      customTtl: 60,
      customLimit: 10,
    });

    if (!result.isAllowed) {
      throw new Error('Rate limit exceeded');
    }

    return result;
  }
}
```

### Response Headers

The rate limiter will add the following headers to the response:

- `X-RateLimit-Limit`: Total allowed limit
- `X-RateLimit-Remaining`: Remaining allowed requests
- `X-RateLimit-Reset`: Reset timestamp in Unix time
- `X-RateLimit-Reset-Time`: ISO string for reset time
- `X-RateLimit-Window`: Window time in seconds

### Error Response

When rate limit is exceeded, it will return HTTP 429 with response:

```json
{
  "statusCode": 429,
  "message": "Too many login attempts. Please try again in 15 minutes. You have exceeded the limit of 3 login attempts.",
  "error": "Too Many Requests",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/login",
  "method": "POST",
  "rateLimitInfo": {
    "type": "login",
    "currentCount": 3,
    "limit": 3,
    "remainingTime": 900,
    "resetTime": "2024-01-01T00:15:00.000Z"
  }
}
```

## Performance Optimizations

### Redis Pipeline Implementation

The rate limiter uses Redis pipelines to reduce round-trips and significantly improve performance.

#### Performance Bottlenecks Before Optimization

The original implementation had several bottlenecks:

1. **Multiple Redis Round-trips**: Each rate limit check required 3-4 separate Redis operations
2. **Sequential Operations**: Operations were executed one after another, increasing latency
3. **Network Overhead**: Each Redis command had its own network round-trip

#### Performance Impact

```
Original Implementation:
├── GET key (check current count)
├── TTL key (get remaining time)
├── INCR key (increment count)
└── EXPIRE key (set/refresh TTL)

Total: 4 round-trips to Redis
Latency: ~4 × network_latency + 4 × redis_processing_time
```

#### Redis Pipeline Solution

Redis Pipeline allows multiple commands to be sent to Redis in a single network round-trip, significantly reducing latency and improving throughput.

#### Performance Improvements

| Operation               | Before         | After        | Improvement         |
| ----------------------- | -------------- | ------------ | ------------------- |
| **Single Request**      | 4 round-trips  | 1 round-trip | **75% reduction**   |
| **Status Check**        | 2 round-trips  | 1 round-trip | **50% reduction**   |
| **Batch (10 requests)** | 40 round-trips | 1 round-trip | **97.5% reduction** |

#### Throughput Improvement

```
Throughput Formula: requests_per_second = 1 / (network_latency + redis_processing_time)

Example with 1ms network latency:
- Before: 1 / (4ms + 4ms) = 125 requests/second
- After:  1 / (1ms + 4ms) = 200 requests/second

Improvement: 60% increase in throughput
```

## Testing Endpoints

The rate limiter provides testing endpoints at `/rate-limit`:

- `GET /rate-limit/test/general` - Test general rate limiting
- `GET /rate-limit/test/sensitive` - Test sensitive rate limiting
- `POST /rate-limit/test/login` - Test login rate limiting
- `POST /rate-limit/test/upload` - Test upload rate limiting
- `GET /rate-limit/test/custom` - Test custom rate limiting
- `GET /rate-limit/config` - Get current configuration
- `GET /rate-limit/health` - Redis health check
- `GET /rate-limit/status/:type/:identifier` - Get rate limit status
- `DELETE /rate-limit/reset/:type/:identifier` - Reset rate limit

## Environment Configuration

### Development

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_KEY_PREFIX=cv-scanner-dev:
REDIS_RETRY_DELAY_ON_FAILOVER=100
REDIS_MAX_RETRIES_PER_REQUEST=3
```

### Production

```env
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_KEY_PREFIX=cv-scanner-prod:
REDIS_RETRY_DELAY_ON_FAILOVER=300
REDIS_MAX_RETRIES_PER_REQUEST=5
```

## Project Setup

```bash
$ npm install
```

## Compile and Run the Project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Docker Support

```bash
# Development
$ npm run docker:build:dev
$ npm run docker:up:dev

# Production
$ docker-compose up -d
```

## Run Tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Monitoring and Logging

### Log Levels

- **Info**: Rate limit warnings (80% threshold)
- **Warn**: Rate limit exceeded
- **Error**: Redis connection errors, service failures

### Log Format

```json
{
  "type": "login",
  "identifier": "192.168.1.1",
  "currentCount": 3,
  "limit": 3,
  "remainingTime": 900,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Health Checks

```typescript
// Check Redis health
const isHealthy = await this.rateLimiterService.isHealthy();

// Get rate limit status
const status = await this.rateLimiterService.getRateLimitStatus({
  type: 'login',
  identifier: '192.168.1.1',
});
```

## Best Practices

1. **Use Appropriate Decorators**: Choose decorators according to endpoint sensitivity
2. **Monitor Logs**: Monitor logs to detect attack patterns
3. **Adjust Limits**: Adjust limits based on traffic patterns
4. **Health Monitoring**: Use health check endpoints for monitoring
5. **Error Handling**: Handle Redis connection errors gracefully
6. **Testing**: Test rate limiting with various scenarios

## Troubleshooting

### Redis Connection Issues

- Check Redis server status
- Verify connection parameters
- Check network connectivity
- Review Redis logs

### Rate Limit Not Working

- Verify decorator usage
- Check interceptor registration
- Confirm Redis connectivity
- Review configuration values

### Performance Issues

- Monitor Redis memory usage
- Check key expiration settings
- Review TTL values
- Consider Redis clustering for high traffic

## Dependencies

- `@nestjs/common`: NestJS core functionality
- `@nestjs/config`: Configuration management
- `ioredis`: Redis client
- `redis`: Redis types
- `winston`: Logging
- `cloudinary`: File upload service

## Architecture

```
RateLimitDecorator → RateLimitInterceptor → RateLimiterService → RedisService → Redis
                                      ↓
                              Response Headers
                                      ↓
                              Error Handling
                                      ↓
                              Logging & Monitoring
```

## Future Optimizations

### 1. Connection Pooling

- Implement Redis connection pooling for high concurrency
- Use Redis Cluster for horizontal scaling

### 2. Caching Layer

- Add in-memory caching for frequently accessed rate limits
- Implement cache warming strategies

### 3. Async Processing

- Process rate limit updates asynchronously
- Use Redis streams for real-time updates

### 4. Metrics Collection

- Implement detailed performance metrics
- Add alerting for performance degradation

## Conclusion

This rate limiter is designed with SOLID principles and follows NestJS best practices to ensure high maintainability and scalability. The Redis pipeline implementation provides:

- **75% reduction** in network round-trips
- **60% increase** in throughput
- **Better resource utilization**
- **Maintained backward compatibility**
- **Improved error handling**

These optimizations make the rate limiter more scalable and suitable for high-traffic production environments while maintaining the same functionality and reliability.

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
