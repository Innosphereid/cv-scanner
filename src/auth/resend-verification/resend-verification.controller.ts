import {
  Controller,
  Post,
  Body,
  Query,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ResendVerificationService } from './resend-verification.service';
import {
  ResendVerificationQueryDto,
  ResendVerificationBodyDto,
  ResendVerificationRequestDto,
} from './dto/resend-verification.dto';
import { RateLimitSensitive } from '../../middlewares/rate-limiter/rate-limit.decorator';
import { RateLimitInterceptor } from '../../middlewares/rate-limiter/rate-limit.interceptor';

@Controller('api/v1/auth/resend-verification')
@UseInterceptors(RateLimitInterceptor)
export class ResendVerificationController {
  constructor(
    private readonly resendVerificationService: ResendVerificationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @RateLimitSensitive()
  async resendVerification(
    @Query() query: ResendVerificationQueryDto,
    @Body() body: ResendVerificationBodyDto,
    @Body() requestData: ResendVerificationRequestDto,
    req: Request,
  ) {
    const input = {
      type: query.type,
      email: body.email,
      ip: requestData.ip || req.ip,
      userAgent: requestData.userAgent || req.get('User-Agent'),
    };

    // Check authentication requirement based on type
    if (query.type === 'forgot-password') {
      // This will be handled by the guard if the route is protected
      return this.resendVerificationService.resendForgotPasswordVerification(
        input,
      );
    } else if (query.type === 'register') {
      return this.resendVerificationService.resendRegisterVerification(input);
    } else {
      throw new BadRequestException(
        'Invalid type parameter. Must be "register" or "forgot-password"',
      );
    }
  }
}
