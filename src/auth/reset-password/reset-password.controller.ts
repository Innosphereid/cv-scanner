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
import { ResetPasswordService } from './reset-password.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SuccessBuilder } from '../../utils/responses/success';
import { ErrorBuilder } from '../../utils/responses/fail';
import { RequestContextInterceptor } from '../../utils/responses/request-context.interceptor';
import { RequestMetadata } from '../../utils/responses/types';
import { RateLimitInterceptor } from '../../middlewares/rate-limiter/rate-limit.interceptor';
import { RateLimiterService } from '../../middlewares/rate-limiter/rate-limiter.service';
import { createHash } from 'crypto';
// Use ResetPasswordDto directly; it already includes strong password validator

@Controller()
@UseInterceptors(RateLimitInterceptor, RequestContextInterceptor)
export class ResetPasswordController {
  constructor(
    private readonly service: ResetPasswordService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async reset(
    @Body() body: ResetPasswordDto,
    @Req() req: Request & { requestMetadata?: RequestMetadata },
  ) {
    const meta: RequestMetadata = req.requestMetadata || {
      request_id: '',
      execution_time: 0,
    };

    try {
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

      const result = await this.service.reset({
        email: normalizedEmail,
        otp: body.otp,
        newPassword: body.newPassword,
        ip: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
      return new SuccessBuilder()
        .message('Password reset successful')
        .data(result)
        .metadata(meta)
        .status(HttpStatus.OK)
        .build();
    } catch (e: unknown) {
      let message = 'Failed to reset password';
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
            code: 'RESET_PASSWORD_ERROR',
            message,
          },
        ])
        .metadata(meta)
        .status(status)
        .build();
    }
  }
}
