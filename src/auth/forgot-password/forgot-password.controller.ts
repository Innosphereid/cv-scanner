import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
  Req,
  HttpException,
} from '@nestjs/common';
import { Request } from 'express';
import { ForgotPasswordService } from './forgot-password.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { SuccessBuilder } from '../../utils/responses/success';
import { ErrorBuilder } from '../../utils/responses/fail';
import { RequestContextInterceptor } from '../../utils/responses/request-context.interceptor';
import { RequestMetadata } from '../../utils/responses/types';
import { RateLimitInterceptor } from '../../middlewares/rate-limiter/rate-limit.interceptor';
import { RateLimiterService } from '../../middlewares/rate-limiter/rate-limiter.service';
import { createHash } from 'crypto';

@Controller()
@UseInterceptors(RateLimitInterceptor, RequestContextInterceptor)
export class ForgotPasswordController {
  constructor(
    private readonly service: ForgotPasswordService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgot(
    @Body() body: ForgotPasswordDto,
    @Req() req: Request & { requestMetadata?: RequestMetadata },
  ) {
    const meta: RequestMetadata = req.requestMetadata || {
      request_id: '',
      execution_time: 0,
    };

    try {
      // Apply per-identifier rate limit: if user exists use userId, else use sha256(email)
      const normalizedEmail = body.email.trim().toLowerCase();
      const emailHash = createHash('sha256')
        .update(normalizedEmail)
        .digest('hex');
      const identifier = `user-or-email:${emailHash}`;
      const rl = await this.rateLimiter.checkRateLimit({
        type: 'login',
        identifier,
        customTtl: 3600,
        customLimit: 3,
      });
      if (!rl.isAllowed) {
        return new ErrorBuilder()
          .message('Too many requests, please try again later')
          .errors([
            {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded',
            },
          ])
          .metadata(meta)
          .status(HttpStatus.TOO_MANY_REQUESTS)
          .build();
      }

      const result = await this.service.requestReset({
        email: normalizedEmail,
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
      return new SuccessBuilder()
        .message('OTP has been sent to your email')
        .data(result)
        .metadata(meta)
        .status(HttpStatus.OK)
        .build();
    } catch (e: unknown) {
      let message = 'Failed to process request';
      let status = HttpStatus.BAD_REQUEST;
      if (e instanceof HttpException) {
        message = e.message;
        status = e.getStatus();
      } else if (e instanceof Error) {
        message = e.message;
      }
      return new ErrorBuilder()
        .message(message)
        .errors([
          {
            code: 'FORGOT_PASSWORD_ERROR',
            message,
          },
        ])
        .metadata(meta)
        .status(status)
        .build();
    }
  }
}
