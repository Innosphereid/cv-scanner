import * as winston from 'winston';
import * as DailyRotateFileNS from 'winston-daily-rotate-file';
import TransportStream from 'winston-transport';
// Create a runtime-safe constructor that works for both CJS and ESM builds
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
type RotateFileOptions = {
  filename: string;
  datePattern?: string;
  level?: string;
  maxSize?: string | number;
  maxFiles?: string | number;
  zippedArchive?: boolean;
};

const DailyRotateFileCtor: new (
  options?: RotateFileOptions,
) => TransportStream =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  (DailyRotateFileNS as any).default ?? (DailyRotateFileNS as any);
import { Injectable, LoggerService } from '@nestjs/common';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

export interface LogMetadata {
  timestamp?: string;
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
  duration?: number;
  [key: string]: any;
}

@Injectable()
export class Logger implements LoggerService {
  private logger: winston.Logger;
  private isDevelopment: boolean;

  constructor() {
    // Treat any non-production env (e.g., development, test, staging) as development-like
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.initializeLogger();
  }

  private initializeLogger(): void {
    const logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;

    // Base configuration
    const baseConfig: winston.LoggerOptions = {
      level: logLevel,
      format: this.getFormat(),
      transports: this.getTransports(),
      exitOnError: false,
    };

    this.logger = winston.createLogger(baseConfig);

    // Add error handling

    this.logger.on('error', error => {
      console.error('Logger error:', error);
    });
  }

  private getFormat(): winston.Logform.Format {
    if (this.isDevelopment) {
      return winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.printf((info: Record<string, unknown>) => {
          const { timestamp, level, message, stack, ...meta } = info as {
            timestamp?: string;
            level: string;
            message: unknown;
            stack?: unknown;
            [key: string]: unknown;
          };

          const safeMessage =
            typeof message === 'string' ? message : JSON.stringify(message);
          let log = `${timestamp ?? ''} [${level}]: ${safeMessage}`.trim();

          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
          }

          if (typeof stack === 'string') {
            log += `\n${stack}`;
          }

          return log;
        }),
      );
    } else {
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      );
    }
  }

  private getTransports(): TransportStream[] {
    const transports: TransportStream[] = [];

    // Add stream transports for all environments
    this.addStreamTransports(transports);

    // Add file transports for production
    if (!this.isDevelopment) {
      this.addFileTransports(transports);
    }

    return transports;
  }

  /**
   * Add stream-based transports (stdout/stderr)
   */
  private addStreamTransports(transports: TransportStream[]): void {
    // Stream transport for general logs
    transports.push(
      new winston.transports.Stream({
        stream: process.stdout,
        level: this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
      }) as unknown as TransportStream,
    );

    // Stream transport for error logs
    transports.push(
      new winston.transports.Stream({
        stream: process.stderr,
        level: LogLevel.ERROR,
      }) as unknown as TransportStream,
    );
  }

  /**
   * Add file-based transports for production environment
   */
  private addFileTransports(transports: TransportStream[]): void {
    // Error logs file transport
    const errorTransport = this.createErrorFileTransport();
    transports.push(errorTransport);

    // Combined logs file transport
    const combinedTransport = this.createCombinedFileTransport();
    transports.push(combinedTransport);
  }

  /**
   * Create error log file transport
   */
  private createErrorFileTransport(): TransportStream {
    const errorFileOptions: RotateFileOptions = {
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d', // Keep 14 days of error logs
      zippedArchive: true,
    };

    return new DailyRotateFileCtor(errorFileOptions);
  }

  /**
   * Create combined log file transport
   */
  private createCombinedFileTransport(): TransportStream {
    const combinedFileOptions: RotateFileOptions = {
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d', // Keep 30 days of combined logs
      zippedArchive: true,
    };

    return new DailyRotateFileCtor(combinedFileOptions);
  }

  // Winston logger methods
  private logWithMetadata(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
  ): void {
    const cleanedMeta: Record<string, any> | undefined = metadata
      ? { ...metadata }
      : undefined;

    this.logger.log(level, message, cleanedMeta);
  }

  // NestJS LoggerService interface methods
  log(message: string, context?: string, metadata?: LogMetadata): void {
    const logMessage = context ? `[${context}] ${message}` : message;
    this.logWithMetadata(LogLevel.INFO, logMessage, metadata);
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: LogMetadata,
  ): void {
    const logMessage = context ? `[${context}] ${message}` : message;
    const logMetadata = { ...metadata, stack: trace };
    this.logWithMetadata(LogLevel.ERROR, logMessage, logMetadata);
  }

  warn(message: string, context?: string, metadata?: LogMetadata): void {
    const logMessage = context ? `[${context}] ${message}` : message;
    this.logWithMetadata(LogLevel.WARN, logMessage, metadata);
  }

  debug(message: string, context?: string, metadata?: LogMetadata): void {
    const logMessage = context ? `[${context}] ${message}` : message;
    this.logWithMetadata(LogLevel.DEBUG, logMessage, metadata);
  }

  verbose(message: string, context?: string, metadata?: LogMetadata): void {
    const logMessage = context ? `[${context}] ${message}` : message;
    this.logWithMetadata(LogLevel.VERBOSE, logMessage, metadata);
  }

  // Additional convenience methods
  info(message: string, metadata?: LogMetadata): void {
    this.logWithMetadata(LogLevel.INFO, message, metadata);
  }

  http(message: string, metadata?: LogMetadata): void {
    this.logWithMetadata(LogLevel.HTTP, message, metadata);
  }

  // Method to log HTTP requests
  logHttpRequest(
    method: string,
    url: string,
    duration: number,
    statusCode: number,
    requestId?: string,
  ): void {
    const metadata: LogMetadata = {
      method,
      url,
      duration,
      statusCode,
      requestId,
    };

    if (statusCode >= 400) {
      this.error(
        `HTTP ${method} ${url} - ${statusCode} (${duration}ms)`,
        undefined,
        undefined,
        metadata,
      );
    } else {
      this.http(
        `HTTP ${method} ${url} - ${statusCode} (${duration}ms)`,
        metadata,
      );
    }
  }

  // Method to log with request context
  logWithRequestContext(
    message: string,
    requestId: string,
    additionalMetadata?: LogMetadata,
  ): void {
    const metadata: LogMetadata = {
      requestId,
      ...additionalMetadata,
    };
    this.info(message, metadata);
  }

  // Method to set log level dynamically
  setLogLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  // Method to get current logger instance (for advanced usage)
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// Factory function to create logger instance
export function createLogger(): Logger {
  return new Logger();
}

// Default logger instance
export const logger = createLogger();
