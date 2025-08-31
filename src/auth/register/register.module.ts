import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity';
import { EmailVerificationTokenEntity } from '../../entities/email-verification-token.entity';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, EmailVerificationTokenEntity]),
    MailModule,
  ],
  controllers: [RegisterController],
  providers: [RegisterService],
  exports: [RegisterService],
})
export class RegisterModule {}
