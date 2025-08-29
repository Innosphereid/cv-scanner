import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../entities/user.entity';
import {
  LoginRequest,
  LoginResponse,
  JwtPayload,
  UserLockoutInfo,
} from './types';
import { Logger as CustomLogger } from '../../utils/logger';
import { LockedException } from './exceptions/locked.exception';

@Injectable()
export class LoginService {
  private readonly logger = new CustomLogger();
  private readonly maxLockoutAttempts = 5;
  private readonly lockoutDurationMinutes = 15;
  private readonly jwtTtlRegex = /^(\d+)([mhd])$/;

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    input: LoginRequest,
    ip: string,
    userAgent: string,
  ): Promise<LoginResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();

    this.logger.info('Login attempt', {
      email: normalizedEmail,
      ip,
      userAgent: userAgent.substring(0, 100), // Truncate for security
    });

    // Find user by email
    const user = await this.usersRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn('Login failed: User not found', 'LoginService', {
        email: normalizedEmail,
        ip,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is verified
    if (!user.verified) {
      this.logger.warn('Login failed: User not verified', 'LoginService', {
        userId: user.id,
        email: normalizedEmail,
        ip,
      });
      throw new ForbiddenException(
        'Please verify your email before logging in',
      );
    }

    // Check lockout status
    const lockoutInfo = this.getUserLockoutInfo(user);
    if (lockoutInfo.isLocked) {
      this.logger.warn('Login failed: Account locked', 'LoginService', {
        userId: user.id,
        email: normalizedEmail,
        ip,
        lockedUntil: lockoutInfo.lockedUntil,
      });
      throw new LockedException(
        `Account locked until ${lockoutInfo.lockedUntil?.toISOString()}`,
      );
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(
      input.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      this.logger.warn('Login failed: Invalid password', 'LoginService', {
        userId: user.id,
        email: normalizedEmail,
        ip,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset lockout attempts on successful login
    if (user.lockoutAttempts > 0) {
      await this.resetLockoutAttempts(user);
    }

    // Generate JWT token
    const accessToken = this.generateAccessToken(user);

    this.logger.info('Login successful', {
      userId: user.id,
      email: normalizedEmail,
      ip,
    });

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      accessToken,
    };
  }

  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      this.logger.error(
        'Password verification error',
        undefined,
        'LoginService',
        {
          error,
        },
      );
      return false;
    }
  }

  private async handleFailedLogin(user: UserEntity): Promise<void> {
    const newAttempts = user.lockoutAttempts + 1;

    if (newAttempts >= this.maxLockoutAttempts) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(
        lockedUntil.getMinutes() + this.lockoutDurationMinutes,
      );

      await this.usersRepo.update(user.id, {
        lockoutAttempts: newAttempts,
        lockedUntil,
      });

      this.logger.warn(
        'Account locked due to multiple failed attempts',
        'LoginService',
        {
          userId: user.id,
          email: user.email,
          lockoutAttempts: newAttempts,
          lockedUntil,
        },
      );
    } else {
      await this.usersRepo.update(user.id, {
        lockoutAttempts: newAttempts,
      });
    }
  }

  private async resetLockoutAttempts(user: UserEntity): Promise<void> {
    await this.usersRepo.update(user.id, {
      lockoutAttempts: 0,
      lockedUntil: null,
    });
  }

  private getUserLockoutInfo(user: UserEntity): UserLockoutInfo {
    const now = new Date();
    const isLocked = user.lockedUntil !== null && user.lockedUntil > now;
    const remainingAttempts = Math.max(
      0,
      this.maxLockoutAttempts - user.lockoutAttempts,
    );

    return {
      isLocked,
      lockedUntil: user.lockedUntil,
      remainingAttempts,
      maxAttempts: this.maxLockoutAttempts,
    };
  }

  private generateAccessToken(user: UserEntity): string {
    const jwtTtl = this.config.get<string>('auth.jwtTtl') || '15m';

    // Parse JWT TTL to seconds
    const ttlInSeconds = this.parseJwtTtl(jwtTtl);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + ttlInSeconds,
    };

    return this.jwtService.sign(payload);
  }

  private parseJwtTtl(ttl: string): number {
    const match = this.jwtTtlRegex.exec(ttl);
    if (!match) {
      return 15 * 60; // Default to 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 15 * 60;
    }
  }
}
