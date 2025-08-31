import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { PasswordResetOtpEntity } from '../../entities/password-reset-otp.entity';
import { ResetPasswordRequest, ResetPasswordResponse } from './types';
import { verifyOtpHmacSha256 } from '../../utils/crypto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '../../utils/logger';

@Injectable()
export class ResetPasswordService {
  private readonly logger = new Logger();

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(PasswordResetOtpEntity)
    private readonly otpRepo: Repository<PasswordResetOtpEntity>,
    private readonly config: ConfigService,
  ) {}

  async reset(input: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid OTP or expired');
    }

    // Find latest unused OTP for user
    const otpRecord = await this.otpRepo.findOne({
      where: { user: { id: user.id }, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP or expired');
    }
    if (otpRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid OTP or expired');
    }

    const secret = this.config.get<string>('auth.otpHmacSecret')!;
    const isValid = verifyOtpHmacSha256(
      input.otp,
      secret,
      otpRecord.salt,
      otpRecord.otpHash,
    );
    if (!isValid) {
      this.logger.warn(
        'Reset password failed: invalid OTP',
        'ResetPasswordService',
        {
          userId: user.id,
          ip: input.ip,
        },
      );
      throw new BadRequestException('Invalid OTP or expired');
    }

    const rounds = this.config.get<number>('auth.bcryptRounds') ?? 12;
    const hashFn: (data: string, rounds: number) => Promise<string> =
      bcrypt.hash as unknown as (
        data: string,
        rounds: number,
      ) => Promise<string>;
    const newHash = await hashFn(input.newPassword, rounds);

    user.passwordHash = newHash;
    user.tokenVersion = user.tokenVersion + 1;
    await this.usersRepo.save(user);

    otpRecord.usedAt = new Date();
    await this.otpRepo.save(otpRecord);

    this.logger.info('Password reset successful and sessions revoked', {
      userId: user.id,
      ip: input.ip,
      userAgent: input.userAgent.substring(0, 100),
    });

    return { email: user.email, success: true };
  }
}
