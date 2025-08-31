import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseInterceptors,
  Req,
  HttpException,
} from '@nestjs/common';
import { VerifyEmailService } from './verify-email.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SuccessBuilder } from '../../utils/responses/success';
import { ErrorBuilder } from '../../utils/responses/fail';
import { RequestContextInterceptor } from '../../utils/responses/request-context.interceptor';
import {
  RateLimitCustom,
  RateLimitInterceptor,
} from '../../middlewares/rate-limiter';
import { Request } from 'express';
import { RequestMetadata } from '../../utils/responses/types';

@Controller()
@UseInterceptors(RateLimitInterceptor, RequestContextInterceptor)
export class VerifyEmailController {
  constructor(private readonly verifyEmailService: VerifyEmailService) {}

  @Get('verify-email')
  @RateLimitCustom(300, 30, 'Verify email limit')
  async verify(
    @Query() query: VerifyEmailDto,
    @Req() req: Request & { requestMetadata?: RequestMetadata },
  ) {
    try {
      const result = await this.verifyEmailService.verify({
        token: query.token,
      });
      const meta: RequestMetadata = req.requestMetadata || {
        request_id: '',
        execution_time: 0,
      };
      return new SuccessBuilder()
        .message('Email verified successfully')
        .data(result)
        .metadata(meta)
        .status(HttpStatus.OK)
        .build();
    } catch (e: unknown) {
      const meta: RequestMetadata = req?.requestMetadata || {
        request_id: '',
        execution_time: 0,
      };
      let message = 'Verification failed';
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
            code: 'VERIFY_EMAIL_ERROR',
            message,
          },
        ])
        .metadata(meta)
        .status(status)
        .build();
    }
  }
}
