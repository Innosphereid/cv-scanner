import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseInterceptors,
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

@Controller('auth')
@UseInterceptors(RateLimitInterceptor, RequestContextInterceptor)
export class VerifyEmailController {
  constructor(private readonly verifyEmailService: VerifyEmailService) {}

  @Get('verify-email')
  @RateLimitCustom(300, 30, 'Verify email limit')
  async verify(
    @Query() query: VerifyEmailDto,
    req: Request & { requestMetadata?: RequestMetadata },
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
    } catch (e: any) {
      const meta: RequestMetadata = req.requestMetadata || {
        request_id: '',
        execution_time: 0,
      };
      return new ErrorBuilder()
        .message(e?.message || 'Verification failed')
        .errors([
          {
            code: 'VERIFY_EMAIL_ERROR',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            message: e?.message || 'Verification failed',
          },
        ])
        .metadata(meta)
        .status(e?.status || HttpStatus.BAD_REQUEST)
        .build();
    }
  }
}
