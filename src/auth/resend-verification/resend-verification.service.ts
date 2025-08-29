import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../../entities/user.entity';
import { EmailVerificationTokenEntity } from '../../entities/email-verification-token.entity';
import { PasswordResetOtpEntity } from '../../entities/password-reset-otp.entity';
import { MailService } from '../../mail/mail.service';
import { RateLimiterService } from '../../middlewares/rate-limiter/rate-limiter.service';
import { Logger } from '../../utils/logger';
import {
  ResendVerificationRequest,
  ResendVerificationResponse,
  RateLimitKey,
  TokenGenerationResult,
  OtpGenerationResult,
} from './types';
import { createHash, randomBytes } from 'crypto';
import { generateNumericOtp, hashOtpHmacSha256 } from '../../utils/crypto';

@Injectable()
export class ResendVerificationService {
  private readonly logger = new Logger();

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly emailTokensRepo: Repository<EmailVerificationTokenEntity>,
    @InjectRepository(PasswordResetOtpEntity)
    private readonly otpRepo: Repository<PasswordResetOtpEntity>,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly rateLimiterService: RateLimiterService,
  ) {}

  async resendRegisterVerification(
    input: ResendVerificationRequest,
  ): Promise<ResendVerificationResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check rate limit for email-based resend (3/day per email)
    await this.checkRateLimit({
      type: 'email',
      identifier: `resend_register:${normalizedEmail}`,
    });

    const user = await this.usersRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn(
        'Resend verification requested for non-existing email',
        'ResendVerificationService',
        {
          email: normalizedEmail,
          ip: input.ip,
          userAgent: input.userAgent?.substring(0, 100),
        },
      );
      throw new BadRequestException('Email not registered');
    }

    if (user.verified) {
      throw new ConflictException('Email already verified');
    }

    // Invalidate previous verification tokens
    const currentTime = new Date();
    await this.emailTokensRepo.update(
      { user: { id: user.id }, usedAt: undefined },
      { usedAt: currentTime },
    );

    // Generate new verification token
    const { token, tokenHash, expiresAt } =
      this.generateEmailVerificationToken();
    const evToken = this.emailTokensRepo.create({
      user,
      tokenHash,
      expiresAt,
      usedAt: null,
    });
    await this.emailTokensRepo.save(evToken);

    // Enqueue verification email
    const appBase = this.config.get<string>('auth.appBaseUrl')!;
    const verifyUrl = `${appBase}/verify-email?token=${encodeURIComponent(token)}`;
    await this.mailService.enqueueVerificationEmail({
      toEmail: user.email,
      verifyUrl,
    });

    this.logger.info('Register verification email resent', {
      userId: user.id,
      email: user.email,
      ip: input.ip,
      userAgent: input.userAgent?.substring(0, 100),
    });

    return {
      email: user.email,
      sent: true,
      message: 'Verification email sent successfully',
    };
  }

  async resendForgotPasswordVerification(
    input: ResendVerificationRequest,
  ): Promise<ResendVerificationResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Check rate limit for user-based resend (3/day per user)
    await this.checkRateLimit({
      type: 'user',
      identifier: `resend_forgot_password:${normalizedEmail}`,
    });

    const user = await this.usersRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      this.logger.warn(
        'Resend forgot password requested for non-existing email',
        'ResendVerificationService',
        {
          email: normalizedEmail,
          ip: input.ip,
          userAgent: input.userAgent?.substring(0, 100),
        },
      );
      throw new BadRequestException('Email not registered');
    }

    // Invalidate previous OTPs
    const currentTime = new Date();
    await this.otpRepo.update(
      { user: { id: user.id }, usedAt: undefined },
      { usedAt: currentTime },
    );

    // Generate new OTP
    const { otp, otpHash, salt, expiresAt } = this.generatePasswordResetOtp();
    const otpRecord = this.otpRepo.create({
      user,
      otpHash,
      salt,
      expiresAt,
      usedAt: null,
    });
    await this.otpRepo.save(otpRecord);

    // Enqueue reset OTP email
    await this.mailService.enqueueResetOtpEmail({
      toEmail: user.email,
      otp,
      appName: this.config.get<string>('mailer.fromName') || 'CV Scanner',
    });

    this.logger.info('Forgot password OTP email resent', {
      userId: user.id,
      email: user.email,
      ip: input.ip,
      userAgent: input.userAgent?.substring(0, 100),
    });

    return {
      email: user.email,
      sent: true,
      message: 'Password reset OTP email sent successfully',
    };
  }

  private async checkRateLimit(rateLimitKey: RateLimitKey): Promise<void> {
    const result = await this.rateLimiterService.checkRateLimit({
      type: 'sensitive',
      identifier: rateLimitKey.identifier,
      customTtl: 86400, // 24 hours
      customLimit: 3, // 3 attempts per day
    });

    if (!result.isAllowed) {
      const resetTimeMs = result.resetTime.getTime();
      const minutesUntilReset = Math.ceil(
        (resetTimeMs - Date.now()) / 1000 / 60,
      );

      throw new BadRequestException(
        `Too many resend attempts. Please try again after ${minutesUntilReset} minutes.`,
      );
    }
  }

  private generateEmailVerificationToken(): TokenGenerationResult {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expirationTime = Date.now() + 5 * 60 * 1000; // 5 minutes
    const expiresAt = new Date(expirationTime);

    return { token, tokenHash, expiresAt };
  }

  private generatePasswordResetOtp(): OtpGenerationResult {
    const otp = generateNumericOtp(6);
    const secret = this.config.get<string>('auth.otpHmacSecret')!;
    const { otpHash, salt } = hashOtpHmacSha256(otp, secret);
    const expirationTime = Date.now() + 5 * 60 * 1000; // 5 minutes
    const expiresAt = new Date(expirationTime);

    return { otp, otpHash, salt, expiresAt };
  }
}
