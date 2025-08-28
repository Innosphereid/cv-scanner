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
import { RegisterService } from './register.service';
import { RegisterDto } from './dto/register.dto';
import {
  RateLimitCustom,
  RateLimitInterceptor,
} from '../../middlewares/rate-limiter';
import { SuccessBuilder } from '../../utils/responses/success';
import { ErrorBuilder } from '../../utils/responses/fail';
import { Request } from 'express';
import { RequestContextInterceptor } from '../../utils/responses/request-context.interceptor';
import { RequestMetadata } from '../../utils/responses/types';

@Controller()
@UseInterceptors(RateLimitInterceptor, RequestContextInterceptor)
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimitCustom(3600, 5, 'Register limit 5/hour per IP')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request & { requestMetadata?: RequestMetadata },
  ) {
    try {
      const result = await this.registerService.register({
        email: body.email,
        password: body.password,
      });
      const meta: RequestMetadata = req.requestMetadata || {
        request_id: '',
        execution_time: 0,
      };
      return new SuccessBuilder()
        .message('Registration successful')
        .data(result)
        .metadata(meta)
        .status(HttpStatus.CREATED)
        .build();
    } catch (e: unknown) {
      let status = HttpStatus.BAD_REQUEST;
      let message = 'Registration failed';
      if (e instanceof HttpException) {
        status = e.getStatus();
        message = e.message;
      } else if (e instanceof Error) {
        message = e.message;
      }
      const meta: RequestMetadata = req.requestMetadata || {
        request_id: '',
        execution_time: 0,
      };
      return new ErrorBuilder()
        .message(message)
        .errors([
          {
            code: 'REGISTER_ERROR',
            message,
          },
        ])
        .metadata(meta)
        .status(status as number)
        .build();
    }
  }
}
