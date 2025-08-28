# Rate Limiter Middleware

Rate limiter middleware yang modular, flexible, maintainable, dan reliable untuk mencegah serangan DDoS pada aplikasi CV Scanner.

## Fitur Utama

- **Environment-based Configuration**: Konfigurasi berbeda untuk development dan production
- **Multiple Rate Limit Types**: General, sensitive, login, dan upload dengan limit yang berbeda
- **Redis-based Storage**: Menggunakan Redis untuk storage yang scalable
- **IP-based Limiting**: Rate limiting berdasarkan IP address
- **Custom Rate Limits**: Kemampuan untuk set custom TTL dan limit
- **Comprehensive Logging**: Logging untuk monitoring dan debugging
- **Health Checks**: Endpoint untuk monitoring kesehatan Redis
- **Easy Integration**: Decorator-based approach untuk kemudahan penggunaan

## Konfigurasi Environment

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

## Rate Limit Types

### 1. General (Umum)
- **Development**: 100 requests per minute
- **Production**: 60 requests per minute
- **Use Case**: Endpoint umum yang tidak sensitif

### 2. Sensitive (Sensitif)
- **Development**: 30 requests per minute
- **Production**: 20 requests per minute
- **Use Case**: Endpoint yang memerlukan keamanan lebih

### 3. Login
- **Development**: 5 attempts per 5 minutes
- **Production**: 3 attempts per 15 minutes
- **Use Case**: Endpoint login dan autentikasi

### 4. Upload
- **Development**: 20 uploads per hour
- **Production**: 10 uploads per hour
- **Use Case**: Upload file dan dokumen

## Cara Penggunaan

### 1. Basic Usage dengan Decorator

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { 
  RateLimit, 
  RateLimitGeneral, 
  RateLimitSensitive, 
  RateLimitLogin,
  RateLimitUpload 
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

  // Login rate limiting (paling ketat)
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
    customLimit: 5 
  })
  getCustomLimitedData() {
    return { message: 'Custom limited data' };
  }
}
```

### 2. Manual Rate Limiting

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
      customLimit: 10
    });

    if (!result.isAllowed) {
      throw new Error('Rate limit exceeded');
    }

    return result;
  }
}
```

## Response Headers

Rate limiter akan menambahkan header berikut pada response:

- `X-RateLimit-Limit`: Total limit yang diizinkan
- `X-RateLimit-Remaining`: Sisa request yang diizinkan
- `X-RateLimit-Reset`: Timestamp reset dalam Unix time
- `X-RateLimit-Reset-Time`: ISO string untuk reset time
- `X-RateLimit-Window`: Window time dalam detik

## Error Response

Ketika rate limit exceeded, akan return HTTP 429 dengan response:

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

## Testing Endpoints

Rate limiter menyediakan endpoint testing di `/rate-limit`:

- `GET /rate-limit/test/general` - Test general rate limiting
- `GET /rate-limit/test/sensitive` - Test sensitive rate limiting
- `POST /rate-limit/test/login` - Test login rate limiting
- `POST /rate-limit/test/upload` - Test upload rate limiting
- `GET /rate-limit/test/custom` - Test custom rate limiting
- `GET /rate-limit/config` - Get current configuration
- `GET /rate-limit/health` - Redis health check
- `GET /rate-limit/status/:type/:identifier` - Get rate limit status
- `DELETE /rate-limit/reset/:type/:identifier` - Reset rate limit

## Monitoring dan Logging

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
  identifier: '192.168.1.1'
});
```

## Best Practices

1. **Gunakan Decorator yang Tepat**: Pilih decorator sesuai dengan sensitivitas endpoint
2. **Monitor Logs**: Pantau log untuk detect pattern serangan
3. **Adjust Limits**: Sesuaikan limit berdasarkan traffic patterns
4. **Health Monitoring**: Gunakan health check endpoint untuk monitoring
5. **Error Handling**: Handle Redis connection errors gracefully
6. **Testing**: Test rate limiting dengan berbagai scenario

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

Rate limiter ini dirancang dengan prinsip SOLID dan mengikuti best practices NestJS untuk memastikan maintainability dan scalability yang tinggi.
