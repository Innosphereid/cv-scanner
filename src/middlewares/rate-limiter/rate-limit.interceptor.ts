import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RateLimiterService } from './rate-limiter.service';
import { Logger } from '../../utils/logger';
import {
  RATE_LIMIT_KEY,
  RateLimitMetadata,
  ExtendedRateLimitResult,
} from './rate-limit.decorator';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger();

  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get rate limit metadata from decorator
    const rateLimitMetadata = this.reflector.get<RateLimitMetadata>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // If no rate limiting is configured, proceed normally
    if (!rateLimitMetadata) {
      return next.handle();
    }

    try {
      return await this.processRateLimitedRequest(
        request,
        response,
        rateLimitMetadata,
        next,
      );
    } catch (error) {
      return this.handleRateLimitError(error, request);
    }
  }

  /**
   * Process request with rate limiting
   */
  private async processRateLimitedRequest(
    request: Request,
    response: Response,
    rateLimitMetadata: RateLimitMetadata,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const clientIp = this.getClientIp(request);

    // Check rate limit
    const rateLimitResult = await this.rateLimiterService.checkRateLimit({
      type: rateLimitMetadata.type,
      identifier: clientIp,
      customTtl: rateLimitMetadata.customTtl,
      customLimit: rateLimitMetadata.customLimit,
    });

    // Create extended result with type information
    const extendedResult: ExtendedRateLimitResult = {
      ...rateLimitResult,
      type: rateLimitMetadata.type,
    };

    // Handle rate limit exceeded
    if (!extendedResult.isAllowed) {
      return this.handleRateLimitExceeded(
        request,
        response,
        extendedResult,
        clientIp,
      );
    }

    // Set rate limit headers for successful requests
    this.setRateLimitHeaders(response, extendedResult);

    // Proceed with the request
    return this.handleSuccessfulRequest(next, request, clientIp);
  }

  /**
   * Handle rate limit exceeded scenario
   */
  private handleRateLimitExceeded(
    request: Request,
    response: Response,
    extendedResult: ExtendedRateLimitResult,
    clientIp: string,
  ): Observable<never> {
    // Set rate limit headers
    this.setRateLimitHeaders(response, extendedResult);

    // Log the violation
    this.logRateLimitViolation(request, extendedResult, clientIp);

    // Throw HTTP 429 error
    throw new HttpException(
      this.createRateLimitErrorResponse(request, extendedResult),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Handle successful request processing
   */
  private handleSuccessfulRequest(
    next: CallHandler,
    request: Request,
    clientIp: string,
  ): Observable<any> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        this.logRequestProcessingError(error, request, clientIp);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Handle rate limiting errors
   */
  private handleRateLimitError(
    error: unknown,
    request: Request,
  ): Observable<never> {
    // Handle any errors that occur during rate limiting
    this.logRateLimitError(error, request);

    // If it's already an HTTP exception, re-throw it
    if (error instanceof HttpException) {
      throw error;
    }

    // For other errors, return a generic rate limiting error
    throw new HttpException(
      this.createGenericRateLimitErrorResponse(request),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Log rate limit violation
   */
  private logRateLimitViolation(
    request: Request,
    extendedResult: ExtendedRateLimitResult,
    clientIp: string,
  ): void {
    this.logger.warn(
      `Rate limit exceeded for ${clientIp} on ${request.method} ${request.url}`,
      undefined,
      {
        ip: clientIp,
        method: request.method,
        url: request.url,
        type: extendedResult.type,
        currentCount: extendedResult.currentCount,
        limit: extendedResult.limit,
        remainingTime: extendedResult.remainingTime,
      },
    );
  }

  /**
   * Log request processing error
   */
  private logRequestProcessingError(
    error: unknown,
    request: Request,
    clientIp: string,
  ): void {
    if (error instanceof HttpException) {
      this.logger.error(
        `Request processing error for ${clientIp}`,
        error.message,
        undefined,
        {
          ip: clientIp,
          method: request.method,
          url: request.url,
          error: error.message,
          statusCode: error.getStatus(),
        },
      );
    }
  }

  /**
   * Log rate limit error
   */
  private logRateLimitError(error: unknown, request: Request): void {
    this.logger.error(
      `Rate limiting error for ${request.ip || 'unknown IP'}`,
      undefined,
      undefined,
      {
        ip: request.ip,
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    );
  }

  /**
   * Create rate limit error response
   */
  private createRateLimitErrorResponse(
    request: Request,
    extendedResult: ExtendedRateLimitResult,
  ) {
    return {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: this.getRateLimitErrorMessage(extendedResult),
      error: 'Too Many Requests',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      rateLimitInfo: {
        type: extendedResult.type,
        currentCount: extendedResult.currentCount,
        limit: extendedResult.limit,
        remainingTime: extendedResult.remainingTime,
        resetTime: extendedResult.resetTime,
      },
    };
  }

  /**
   * Create generic rate limit error response
   */
  private createGenericRateLimitErrorResponse(request: Request) {
    return {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Rate limiting service temporarily unavailable',
      error: 'Too Many Requests',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(request: Request): string {
    // Check for forwarded IP headers (for proxy/load balancer scenarios)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = forwardedFor.toString().split(',');
      return ips[0].trim();
    }

    // Check for real IP header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp.toString();
    }

    // Fallback to connection remote address
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  /**
   * Set rate limit headers on response
   */
  private setRateLimitHeaders(
    response: Response,
    rateLimitResult: ExtendedRateLimitResult,
  ): void {
    response.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, rateLimitResult.limit - rateLimitResult.currentCount),
    );
    response.setHeader(
      'X-RateLimit-Reset',
      Math.floor(rateLimitResult.resetTime.getTime() / 1000),
    );
    response.setHeader(
      'X-RateLimit-Reset-Time',
      rateLimitResult.resetTime.toISOString(),
    );
    response.setHeader('X-RateLimit-Window', rateLimitResult.ttl);
  }

  /**
   * Generate user-friendly error message based on rate limit result
   */
  private getRateLimitErrorMessage(
    rateLimitResult: ExtendedRateLimitResult,
  ): string {
    const { type, limit, remainingTime } = rateLimitResult;

    const timeUnit = remainingTime >= 60 ? 'minutes' : 'seconds';
    const timeValue =
      remainingTime >= 60 ? Math.ceil(remainingTime / 60) : remainingTime;

    switch (type) {
      case 'login':
        return `Too many login attempts. Please try again in ${timeValue} ${timeUnit}. You have exceeded the limit of ${limit} login attempts.`;

      case 'sensitive':
        return `Too many requests for sensitive operations. Please wait ${timeValue} ${timeUnit} before trying again. Limit: ${limit} requests.`;

      case 'upload':
        return `File upload limit exceeded. You can upload up to ${limit} files per hour. Please try again in ${timeValue} ${timeUnit}.`;

      case 'general':
      default:
        return `Rate limit exceeded. Please wait ${timeValue} ${timeUnit} before making more requests. Limit: ${limit} requests.`;
    }
  }
}
