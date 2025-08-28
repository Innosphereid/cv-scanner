import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerificationTokenEntity } from '../../entities/email-verification-token.entity';
import { UserEntity } from '../../entities/user.entity';
import { VerifyEmailService } from './verify-email.service';
import { VerifyEmailController } from './verify-email.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerificationTokenEntity, UserEntity]),
  ],
  controllers: [VerifyEmailController],
  providers: [VerifyEmailService],
})
export class VerifyEmailModule {}
