import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity';
import { PasswordResetOtpEntity } from '../../entities/password-reset-otp.entity';
import { ForgotPasswordService } from './forgot-password.service';
import { ForgotPasswordController } from './forgot-password.controller';
import { MailModule } from '../../mail/mail.module';
import { RateLimiterModule } from '../../middlewares/rate-limiter/rate-limiter.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, PasswordResetOtpEntity]),
    MailModule,
    RateLimiterModule,
  ],
  controllers: [ForgotPasswordController],
  providers: [ForgotPasswordService],
})
export class ForgotPasswordModule {}
