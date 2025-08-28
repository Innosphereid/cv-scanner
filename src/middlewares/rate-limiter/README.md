# Rate Limiter Middleware

## Overview

The Rate Limiter Middleware provides comprehensive rate limiting capabilities for the CV Scanner API using Redis as the backend storage. This implementation follows NestJS best practices and implements the Single Responsibility Principle through well-separated concerns.

## Architecture

### Single Responsibility Principle Implementation

The `RateLimiterService` has been refactored to follow the Single Responsibility Principle by breaking down the monolithic `checkRateLimit` method into focused, single-purpose methods:

#### Before Refactoring
- `checkRateLimit()` method was ~40 lines long
- Handled multiple responsibilities in one method
- Difficult to test individual concerns
- Hard to maintain and debug

#### After Refactoring
- **`resolveConfiguration()`** - Handles configuration resolution
- **`processRequest()`** - Manages Redis operations for requests
- **`calculateRateLimitResult()`** - Calculates rate limit results
- **`handleRateLimitError()`** - Manages error handling and fallbacks
- **`checkRateLimit()`** - Orchestrates the flow (now only ~20 lines)

### Method Responsibilities

| Method | Responsibility | Lines | Testability |
|--------|---------------|-------|-------------|
| `resolveConfiguration()` | Config resolution & validation | ~8 | High |
| `processRequest()` | Redis request processing | ~12 | High |
| `calculateRateLimitResult()` | Result calculation | ~15 | High |
| `handleRateLimitError()` | Error handling & fallback | ~12 | High |
| `checkRateLimit()` | Flow orchestration | ~20 | High |

## Components

### 1. RateLimiterService
Core service that implements rate limiting logic with improved separation of concerns.

**Key Methods:**
- `checkRateLimit()` - Main entry point for rate limit checks
- `getRateLimitStatus()` - Get current status without incrementing
- `resetRateLimit()` - Reset rate limit for specific identifier
- `isHealthy()` - Health check for Redis connection

**Private Helper Methods:**
- `resolveConfiguration()` - Resolve TTL and limit configuration
- `processRequest()` - Handle Redis operations for requests
- `calculateRateLimitResult()` - Calculate final rate limit result
- `handleRateLimitError()` - Handle errors with graceful fallback

### 2. RedisService
Handles all Redis operations with proper error handling and connection management.

### 3. RateLimitInterceptor
HTTP interceptor that applies rate limiting to incoming requests.

### 4. Rate Limit Decorators
Decorators for easy application of rate limiting to controllers and methods.

## Usage

### Basic Rate Limiting

```typescript
import { RateLimit, RateLimitLogin } from './middlewares/rate-limiter';

@Controller('auth')
export class AuthController {
  @Post('login')
  @RateLimitLogin()
  async login() {
    // Login logic
  }

  @Post('register')
  @RateLimit({ type: 'sensitive' })
  async register() {
    // Registration logic
  }
}
```

### Custom Rate Limiting

```typescript
@Post('upload')
@RateLimit({ 
  type: 'upload', 
  customTtl: 1800,    // 30 minutes
  customLimit: 50     // 50 uploads per 30 minutes
})
async uploadFile() {
  // File upload logic
}
```

### Rate Limit Types

| Type | Default TTL | Default Limit | Use Case |
|------|-------------|---------------|----------|
| `general` | 60s | 60-100 req | Regular API endpoints |
| `sensitive` | 60s | 20-30 req | Data modification operations |
| `login` | 300-900s | 3-5 req | Authentication endpoints |
| `upload` | 3600s | 10-20 req | File upload operations |

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=cv-scanner:
REDIS_RETRY_DELAY_ON_FAILOVER=100
REDIS_MAX_RETRIES_PER_REQUEST=3
```

### Configuration Object

```typescript
interface RateLimitConfig {
  general: { ttl: number; limit: number };
  sensitive: { ttl: number; limit: number };
  login: { ttl: number; limit: number };
  upload: { ttl: number; limit: number };
}
```

## Benefits of Refactoring

### 1. **Improved Testability**
- Each method can be tested independently
- Easier to mock specific behaviors
- Better test coverage for edge cases

### 2. **Enhanced Maintainability**
- Clear separation of concerns
- Easier to modify specific functionality
- Reduced cognitive load when debugging

### 3. **Better Error Handling**
- Centralized error handling logic
- Consistent fallback behavior
- Easier to add new error scenarios

### 4. **Code Reusability**
- Helper methods can be reused
- Easier to extend functionality
- Cleaner integration with other services

### 5. **Performance Monitoring**
- Easier to profile individual operations
- Better logging and debugging
- Clearer performance bottlenecks

## Testing

The refactored service includes comprehensive tests for each method:

```bash
# Run rate limiter tests
npm test -- --testPathPattern=rate-limiter.service.spec.ts

# Run all tests
npm test
```

## Error Handling

The service implements graceful degradation:

- **Redis Connection Issues**: Falls back to allowing requests
- **Configuration Errors**: Uses default configuration
- **Invalid Input**: Returns appropriate error responses
- **Rate Limit Exceeded**: Returns HTTP 429 with detailed information

## Monitoring & Logging

- **Structured Logging**: JSON format with context
- **Performance Metrics**: Request count and timing
- **Error Tracking**: Comprehensive error logging
- **Health Checks**: Redis connection monitoring

## Future Improvements

1. **Redis Pipeline**: Optimize multiple Redis operations
2. **Rate Limit Analytics**: Dashboard for monitoring
3. **Dynamic Configuration**: Runtime configuration updates
4. **Rate Limit Bypass**: Admin user exemptions
5. **Distributed Rate Limiting**: Support for multiple instances

## Contributing

When adding new features to the rate limiter:

1. Follow the Single Responsibility Principle
2. Keep methods focused and under 20 lines
3. Add comprehensive tests for new functionality
4. Update this documentation
5. Ensure error handling is graceful
