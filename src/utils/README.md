# Logger Utility

Logger utility yang dibangun menggunakan Winston dengan konfigurasi yang berbeda untuk development dan production environment.

## Fitur

- ✅ **Environment-aware**: Konfigurasi berbeda untuk development dan production
- ✅ **Multiple transports**: Console dan file logging
- ✅ **Log rotation**: Otomatis rotate log files berdasarkan ukuran dan waktu
- ✅ **Structured logging**: JSON format untuk production, readable text untuk development
- ✅ **Metadata support**: Request ID, user ID, timestamps, dan custom metadata
- ✅ **NestJS integration**: Compatible dengan NestJS LoggerService interface
- ✅ **Error handling**: Fallback mechanism dan error handling
- ✅ **Flexible configuration**: Dynamic log level dan custom transports

## Installation

```bash
npm install winston winston-daily-rotate-file
```

## Konfigurasi Environment

### Development (.env)

```env
NODE_ENV=development
LOG_LEVEL=debug
```

### Production (.env)

```env
NODE_ENV=production
LOG_LEVEL=info
```

## Penggunaan

### 1. Basic Usage (Dependency Injection)

```typescript
import { Logger } from './utils/logger';

@Injectable()
export class UserService {
  constructor(private readonly logger: Logger) {}

  async createUser(userData: any) {
    try {
      this.logger.info('Creating new user', { userId: userData.id });
      // ... user creation logic
      this.logger.info('User created successfully', { userId: userData.id });
    } catch (error) {
      this.logger.error('Failed to create user', error.stack, 'UserService', {
        userId: userData.id,
      });
      throw error;
    }
  }
}
```

### 2. Direct Usage

```typescript
import { logger } from './utils/logger';

logger.info('Application started');
logger.error('An error occurred');
```

### 3. Logging dengan Context

```typescript
// Dengan context (nama service/component)
this.logger.log('User authenticated', 'AuthService');
this.logger.error(
  'Database connection failed',
  'Connection error',
  'DatabaseService',
);
```

### 4. Logging dengan Metadata

```typescript
const metadata = {
  requestId: 'req-12345',
  userId: 'user123',
  action: 'login',
  ipAddress: '192.168.1.1',
};

this.logger.info('User login attempt', metadata);
```

### 5. HTTP Request Logging

```typescript
// Otomatis log level berdasarkan status code
this.logger.logHttpRequest('POST', '/api/users', 150, 201, 'req-12345');
```

### 6. Request Context Logging

```typescript
this.logger.logWithRequestContext('Processing user request', 'req-12345', {
  userId: 'user123',
  action: 'update_profile',
});
```

## Log Levels

| Level   | Description         | Development | Production |
| ------- | ------------------- | ----------- | ---------- |
| ERROR   | Error messages      | ✅          | ✅         |
| WARN    | Warning messages    | ✅          | ✅         |
| INFO    | General information | ✅          | ✅         |
| HTTP    | HTTP request logs   | ✅          | ✅         |
| VERBOSE | Verbose information | ✅          | ❌         |
| DEBUG   | Debug information   | ✅          | ❌         |
| SILLY   | Very detailed debug | ✅          | ❌         |

## Output Format

### Development

```
2024-01-15 14:30:25 [info]: User created successfully {"userId": "123", "action": "create"}
2024-01-15 14:30:26 [error]: Database connection failed
Error: Connection timeout
    at Database.connect (/app/database.ts:25:10)
```

### Production (JSON)

```json
{
  "level": "info",
  "message": "User created successfully",
  "timestamp": "2024-01-15T14:30:25.000Z",
  "userId": "123",
  "action": "create"
}
```

## File Logging (Production Only)

### Log Rotation

- **Error logs**: `logs/error-2024-01-15.log`
- **Combined logs**: `logs/combined-2024-01-15.log`
- **Max file size**: 20MB
- **Retention**: 14 days (error), 30 days (combined)
- **Compression**: Enabled

### Directory Structure

```
logs/
├── error-2024-01-15.log
├── error-2024-01-16.log
├── combined-2024-01-15.log
├── combined-2024-01-16.log
└── ...
```

## Integration dengan NestJS

### 1. Import LoggerModule

```typescript
import { LoggerModule } from './utils/logger.module';

@Module({
  imports: [LoggerModule],
  // ...
})
export class AppModule {}
```

### 2. Use as Global Logger

```typescript
import { Logger } from '@nestjs/common';

// Logger akan otomatis menggunakan custom logger kita
```

## Advanced Configuration

### Dynamic Log Level

```typescript
// Change log level at runtime
this.logger.setLogLevel(LogLevel.WARN);
```

### Custom Transports

```typescript
// Access underlying Winston logger
const winstonLogger = this.logger.getWinstonLogger();
// Add custom transports, etc.
```

## Error Handling & Fallback

- Jika file logging gagal, logger akan fallback ke console
- Jika Winston error, akan di-catch dan di-log ke console
- `exitOnError: false` mencegah aplikasi crash karena logging error

## Best Practices

1. **Use appropriate log levels**: Don't log everything as INFO
2. **Include relevant metadata**: Request ID, user ID, action, etc.
3. **Use context**: Specify service/component name for better debugging
4. **Avoid logging sensitive data**: Passwords, tokens, etc.
5. **Structured logging**: Use metadata objects instead of string concatenation

## Troubleshooting

### Log tidak muncul

- Check `NODE_ENV` environment variable
- Verify log level configuration
- Check file permissions untuk directory `logs/`

### Performance issues

- Reduce log level di production
- Use async logging jika diperlukan
- Monitor log file sizes

### File logging tidak berfungsi

- Ensure `NODE_ENV=production`
- Check directory permissions
- Verify disk space
