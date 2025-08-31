import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { PasswordResetOtpEntity } from '../../entities/password-reset-otp.entity';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';
import { ForgotPasswordRequest, ForgotPasswordResponse } from './types';
import { generateNumericOtp, hashOtpHmacSha256 } from '../../utils/crypto';
import { Logger } from '../../utils/logger';

@Injectable()
export class ForgotPasswordService {
  private readonly logger = new Logger();

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(PasswordResetOtpEntity)
    private readonly otpRepo: Repository<PasswordResetOtpEntity>,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async requestReset(
    input: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await this.usersRepo.findOne({ where: { email } });

    // Non-generic response as requested, but avoid leaking too much detail in logs
    if (!user) {
      this.logger.warn(
        'Forgot password requested for non-existing email',
        'ForgotPasswordService',
        {
          email,
          ip: input.ip,
        },
      );
      throw new HttpException('Email not registered', HttpStatus.BAD_REQUEST);
    }

    const otp = generateNumericOtp(6);
    const secret = this.config.get<string>('auth.otpHmacSecret')!;
    const { otpHash, salt } = hashOtpHmacSha256(otp, secret);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const record = this.otpRepo.create({
      user,
      otpHash,
      salt,
      expiresAt,
      usedAt: null,
    });
    await this.otpRepo.save(record);

    await this.mailService.enqueueResetOtpEmail({
      toEmail: user.email,
      otp,
      appName: this.config.get<string>('mailer.fromName') || 'CV Scanner',
    });

    this.logger.info('Forgot password OTP generated and email enqueued', {
      userId: user.id,
      email: user.email,
      ip: input.ip,
      userAgent: input.userAgent.substring(0, 100),
    });

    return { email: user.email, sent: true };
  }
}
