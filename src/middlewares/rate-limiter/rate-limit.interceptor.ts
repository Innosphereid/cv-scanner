import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RateLimiterService, RateLimitOptions } from './rate-limiter.service';
import { RATE_LIMIT_KEY, RateLimitMetadata } from './rate-limit.decorator';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

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
      // Get client IP address
      const clientIp = this.getClientIp(request);

      // Check rate limit
      const rateLimitResult = await this.rateLimiterService.checkRateLimit({
        type: rateLimitMetadata.type,
        identifier: clientIp,
        customTtl: rateLimitMetadata.customTtl,
        customLimit: rateLimitMetadata.customLimit,
      });

      // If rate limit exceeded, return error
      if (!rateLimitResult.isAllowed) {
        // Set rate limit headers
        this.setRateLimitHeaders(response, rateLimitResult);

        // Log the violation
        this.logger.warn(
          `Rate limit exceeded for ${clientIp} on ${request.method} ${request.url}`,
          {
            ip: clientIp,
            method: request.method,
            url: request.url,
            type: rateLimitMetadata.type,
            currentCount: rateLimitResult.currentCount,
            limit: rateLimitResult.limit,
            remainingTime: rateLimitResult.remainingTime,
          },
        );

        // Throw HTTP 429 error
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: this.getRateLimitErrorMessage(rateLimitResult),
            error: 'Too Many Requests',
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            rateLimitInfo: {
              type: rateLimitMetadata.type,
              currentCount: rateLimitResult.currentCount,
              limit: rateLimitResult.limit,
              remainingTime: rateLimitResult.remainingTime,
              resetTime: rateLimitResult.resetTime,
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Set rate limit headers for successful requests
      this.setRateLimitHeaders(response, rateLimitResult);

      // Proceed with the request
      return next.handle().pipe(
        catchError(error => {
          // Log any errors that occur during request processing
          if (error instanceof HttpException) {
            this.logger.error(`Request processing error for ${clientIp}`, {
              ip: clientIp,
              method: request.method,
              url: request.url,
              error: error.message,
              statusCode: error.getStatus(),
            });
          }
          return throwError(() => error);
        }),
      );
    } catch (error) {
      // Handle any errors that occur during rate limiting
      this.logger.error(
        `Rate limiting error for ${request.ip || 'unknown IP'}`,
        {
          ip: request.ip,
          method: request.method,
          url: request.url,
          error: error.message,
        },
      );

      // If it's already an HTTP exception, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // For other errors, return a generic rate limiting error
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limiting service temporarily unavailable',
          error: 'Too Many Requests',
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
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
  private setRateLimitHeaders(response: Response, rateLimitResult: any): void {
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
  private getRateLimitErrorMessage(rateLimitResult: any): string {
    const { type, currentCount, limit, remainingTime } = rateLimitResult;

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
