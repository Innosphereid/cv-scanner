import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationTokenEntity } from '../../entities/email-verification-token.entity';
import { UserEntity } from '../../entities/user.entity';
import { VerifyEmailRequest, VerifyEmailResponse } from './types';
import { createHash } from 'crypto';

@Injectable()
export class VerifyEmailService {
  constructor(
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly evRepo: Repository<EmailVerificationTokenEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
  ) {}

  async verify(input: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    const tokenHash = createHash('sha256').update(input.token).digest('hex');

    const record = await this.evRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired token');
    }
    if (record.usedAt) {
      throw new BadRequestException('Token already used');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Token expired');
    }

    const user = record.user;
    if (!user.verified) {
      user.verified = true;
      await this.usersRepo.save(user);
    }

    record.usedAt = new Date();
    await this.evRepo.save(record);

    return { email: user.email, verified: true };
  }
}
