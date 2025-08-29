import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  role: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException('Access token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('auth.jwtSecret'),
      });

      // Attach user info to request for use in controllers/services
      request['user'] = {
        userId: payload.sub,
        role: payload.role,
        tokenVersion: payload.tokenVersion,
      };

      return true;
    } catch {
      // JWT verification failed - token is invalid or expired
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractTokenFromCookie(request: Request): string | null {
    const cookies = request.headers.cookie;
    if (!cookies) {
      return null;
    }

    const cookiePairs = cookies.split(';');
    for (const pair of cookiePairs) {
      const [name, value] = pair.trim().split('=');
      if (name === 'access_token' && value) {
        return value;
      }
    }

    return null;
  }
}
