import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ResendVerificationController } from './resend-verification.controller';
import { ResendVerificationService } from './resend-verification.service';
import { UserEntity } from '../../entities/user.entity';
import { EmailVerificationTokenEntity } from '../../entities/email-verification-token.entity';
import { PasswordResetOtpEntity } from '../../entities/password-reset-otp.entity';
import { MailModule } from '../../mail/mail.module';
import { RateLimiterModule } from '../../middlewares/rate-limiter/rate-limiter.module';
import { LoginModule } from '../login/login.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      EmailVerificationTokenEntity,
      PasswordResetOtpEntity,
    ]),
    ConfigModule,
    MailModule,
    RateLimiterModule,
    LoginModule,
  ],
  controllers: [ResendVerificationController],
  providers: [ResendVerificationService],
  exports: [ResendVerificationService],
})
export class ResendVerificationModule {}
