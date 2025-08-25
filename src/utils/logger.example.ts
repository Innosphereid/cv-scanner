import { Logger, LogMetadata, LogLevel } from './logger';

// Example usage of the logger utility
export class LoggerExample {
  constructor(private readonly logger: Logger) {}

  // Basic logging
  basicLogging(): void {
    this.logger.info('Application started successfully');
    this.logger.warn('This is a warning message');
    this.logger.error('An error occurred', 'Error stack trace here');
    this.logger.debug('Debug information for developers');
  }

  // Logging with context
  loggingWithContext(): void {
    this.logger.log('User authentication successful', 'AuthService');
    this.logger.error(
      'Database connection failed',
      'Database connection error',
      'DatabaseService',
    );
    this.logger.warn('Rate limit approaching', 'RateLimitService');
  }

  // Logging with metadata
  loggingWithMetadata(): void {
    const metadata: LogMetadata = {
      userId: 'user123',
      action: 'login',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
    };

    this.logger.info('User logged in successfully', metadata);
  }

  // HTTP request logging
  logHttpRequest(): void {
    this.logger.logHttpRequest('POST', '/api/users', 150, 201, 'req-12345');
  }

  // Logging with request context
  logWithRequestContext(): void {
    this.logger.logWithRequestContext('Processing user request', 'req-12345', {
      userId: 'user123',
      action: 'update_profile',
    });
  }

  // Dynamic log level change
  changeLogLevel(): void {
    this.logger.setLogLevel(LogLevel.WARN);
    this.logger.info('This info message will not be logged');
    this.logger.warn('This warning will be logged');
    this.logger.error('This error will be logged');
  }
}

// Example of using logger directly (without dependency injection)
export function directLoggerUsage(): void {
  const logger = new Logger();

  logger.info('Direct logger usage');
  logger.error('Error from direct logger');
}

// Example of logging in different environments
export function environmentSpecificLogging(): void {
  const logger = new Logger();

  if (process.env.NODE_ENV === 'development') {
    logger.debug('This debug message only appears in development');
    logger.verbose('Verbose logging for development');
  }

  logger.info('This info message appears in all environments');
  logger.error('Errors are always logged');
}
