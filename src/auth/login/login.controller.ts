import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseInterceptors,
  Req,
  HttpException,
  Res,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LoginService } from './login.service';
import { LoginDto } from './dto/login.dto';
import {
  RateLimitLogin,
  RateLimitInterceptor,
} from '../../middlewares/rate-limiter';
import { SuccessBuilder } from '../../utils/responses/success';
import { ErrorBuilder } from '../../utils/responses/fail';
import { RequestContextInterceptor } from '../../utils/responses/request-context.interceptor';
import { RequestMetadata } from '../../utils/responses/types';
import { Logger } from '../../utils/logger';

@Controller()
@UseInterceptors(RateLimitInterceptor, RequestContextInterceptor)
export class LoginController {
  private readonly logger = new Logger();

  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimitLogin()
  async login(
    @Body() body: LoginDto,
    @Req() req: Request & { requestMetadata?: RequestMetadata },
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const ip = this.getClientIp(req);
      const userAgent = req.get('User-Agent') || 'Unknown';

      const result = await this.loginService.login(
        {
          email: body.email,
          password: body.password,
        },
        ip,
        userAgent,
      );

      const meta: RequestMetadata = req.requestMetadata || {
        request_id: '',
        execution_time: 0,
      };

      // Set JWT token in httpOnly cookie
      const isProduction = process.env.NODE_ENV === 'production';

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
      });

      // Remove accessToken from response body for security
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { accessToken, ...responseData } = result;

      this.logger.info('Login successful', {
        userId: result.userId,
        email: result.email,
        ip,
      });

      return new SuccessBuilder()
        .message('Login successful')
        .data(responseData)
        .metadata(meta)
        .status(HttpStatus.OK)
        .build();
    } catch (e: unknown) {
      let status = HttpStatus.BAD_REQUEST;
      let message = 'Login failed';

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

      this.logger.error(
        'Login failed',
        e instanceof Error ? e.stack : 'Unknown error',
        'LoginController',
      );

      return new ErrorBuilder()
        .message(message)
        .errors([
          {
            code: 'LOGIN_ERROR',
            message,
          },
        ])
        .metadata(meta)
        .status(status as number)
        .build();
    }
  }

  private getClientIp(req: Request): string {
    // Try to get real IP from various headers
    const xForwardedFor = req.get('X-Forwarded-For');
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }

    const xRealIp = req.get('X-Real-IP');
    if (xRealIp) {
      return xRealIp;
    }

    // Fallback to socket remote address (modern Express approach)
    return (req.socket?.remoteAddress as string) || 'unknown';
  }
}
