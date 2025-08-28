import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { EmailVerificationTokenEntity } from '../../entities/email-verification-token.entity';
import { RegisterRequest, RegisterResponse } from './types';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class RegisterService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(EmailVerificationTokenEntity)
    private readonly emailTokensRepo: Repository<EmailVerificationTokenEntity>,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(input: RegisterRequest): Promise<RegisterResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = await this.usersRepo.findOne({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    this.ensurePasswordPolicy(input.password);

    const rounds = this.config.get<number>('auth.bcryptRounds') ?? 12;
    let passwordHash: string;
    try {
      passwordHash = await this.hashPassword(input.password, rounds);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Hashing failed';
      throw new BadRequestException(message);
    }

    const user = this.usersRepo.create({
      email: normalizedEmail,
      passwordHash,
      role: 'user',
      verified: false,
      tokenVersion: 1,
    });
    await this.usersRepo.save(user);

    const { token, tokenHash, expiresAt } =
      this.generateEmailVerificationToken();
    const evToken = this.emailTokensRepo.create({
      user,
      tokenHash,
      expiresAt,
      usedAt: null,
    });
    await this.emailTokensRepo.save(evToken);

    const appBase = this.config.get<string>('auth.appBaseUrl')!;
    const verifyUrl = `${appBase}/verify-email?token=${encodeURIComponent(token)}`;
    await this.mailService.enqueueVerificationEmail({
      toEmail: user.email,
      verifyUrl,
    });

    return { userId: user.id, email: user.email };
  }

  private ensurePasswordPolicy(password: string): void {
    const reasons: string[] = [];
    if (password.length < 8)
      reasons.push('Password must be at least 8 characters');
    if (!/[a-z]/.test(password))
      reasons.push('Password must contain a lowercase letter');
    if (!/[A-Z]/.test(password))
      reasons.push('Password must contain an uppercase letter');
    if (!/\d/.test(password)) reasons.push('Password must contain a number');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
      reasons.push('Password must contain a special character');
    if (reasons.length > 0) {
      throw new BadRequestException(reasons.join(', '));
    }
  }

  private generateEmailVerificationToken(): {
    token: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    return { token, tokenHash, expiresAt };
  }

  private async hashPassword(
    password: string,
    rounds: number,
  ): Promise<string> {
    const hashFn: (data: string, rounds: number) => Promise<string> =
      bcrypt.hash as unknown as (
        data: string,
        rounds: number,
      ) => Promise<string>;
    const hashed: string = await hashFn(password, rounds);
    return hashed;
  }
}
