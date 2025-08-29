import {
  Controller,
  Post,
  Body,
  Query,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ResendVerificationService } from './resend-verification.service';
import {
  ResendVerificationQueryDto,
  ResendVerificationBodyDto,
} from './dto/resend-verification.dto';
import { RateLimitSensitive } from '../../middlewares/rate-limiter/rate-limit.decorator';
import { RateLimitInterceptor } from '../../middlewares/rate-limiter/rate-limit.interceptor';

@Controller('resend-verification')
@UseInterceptors(RateLimitInterceptor)
export class ResendVerificationController {
  constructor(
    private readonly resendVerificationService: ResendVerificationService,
  ) {
    // Ensure service is injected
    if (!this.resendVerificationService) {
      throw new Error('ResendVerificationService is not injected');
    }
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @RateLimitSensitive()
  async resendVerification(
    @Query() query: ResendVerificationQueryDto,
    @Body() body: ResendVerificationBodyDto,
    @Req() req: Request,
  ) {
    try {
      console.log('Request received:', { query, body, req: !!req });

      // Get IP address with fallbacks
      const clientIp =
        body.ip ||
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';

      // Get User-Agent with fallback
      const userAgent = body.userAgent || req.get('User-Agent') || 'unknown';

      console.log('Extracted client info:', { clientIp, userAgent });

      const input = {
        type: query.type,
        email: body.email,
        ip: clientIp,
        userAgent: userAgent,
      };

      console.log('Service input:', input);

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
    } catch (error) {
      // Log the error for debugging
      console.error('Error in resendVerification:', error);
      throw error;
    }
  }
}
