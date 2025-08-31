import { ConflictException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../entities/user.entity';
import { EmailVerificationTokenEntity } from '../../../entities/email-verification-token.entity';
import { RegisterService } from '../register.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../../mail/mail.service';
import * as bcrypt from 'bcrypt';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  findOne?: jest.Mock;
  create?: jest.Mock;
  save?: jest.Mock;
};

function createMockRepo<T extends object>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as MockRepo<T>;
}

describe('RegisterService', () => {
  let service: RegisterService;
  let usersRepo: MockRepo<UserEntity>;
  let tokensRepo: MockRepo<EmailVerificationTokenEntity>;
  let config: ConfigService;
  let mail: MailService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    usersRepo = createMockRepo<UserEntity>();
    tokensRepo = createMockRepo<EmailVerificationTokenEntity>();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RegisterService,
        { provide: getRepositoryToken(UserEntity), useValue: usersRepo },
        {
          provide: getRepositoryToken(EmailVerificationTokenEntity),
          useValue: tokensRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth.bcryptRounds') return 12;
              if (key === 'auth.appBaseUrl') return 'https://app.local';
              return undefined;
            }),
          },
        },
        {
          provide: MailService,
          useValue: { enqueueVerificationEmail: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(RegisterService);
    mail = moduleRef.get(MailService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('registers successfully (happy path)', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    const userId = '11111111-1111-1111-1111-111111111111';
    usersRepo.create!.mockImplementation((data: Partial<UserEntity>) => ({
      ...(data as UserEntity),
      id: userId,
    }));
    usersRepo.save!.mockImplementation(async (data: UserEntity) => data);
    tokensRepo.create!.mockImplementation((data: Partial<EmailVerificationTokenEntity>) => ({
      ...(data as EmailVerificationTokenEntity),
      id: '22222222-2222-2222-2222-222222222222',
    }));
    tokensRepo.save!.mockImplementation(async (data) => data);
    const hashSpy = jest.spyOn(
      (bcrypt as unknown as { hash: (d: string, r: number) => Promise<string> }),
      'hash',
    ) as unknown as jest.MockedFunction<
      (d: string, r: number) => Promise<string>
    >;
    hashSpy.mockResolvedValue('hashed-password');

    const result = await service.register({
      email: 'User+X@Example.com ',
      password: 'Str0ng!Pass',
    });

    expect(result).toEqual({ userId, email: 'user+x@example.com' });
    expect(usersRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user+x@example.com',
        passwordHash: 'hashed-password',
        role: 'user',
        verified: false,
        tokenVersion: 1,
      }),
    );
    expect(usersRepo.save).toHaveBeenCalledTimes(1);
    expect(tokensRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.any(Object), tokenHash: expect.any(String) }),
    );
    const createdToken = (tokensRepo.create as jest.Mock).mock.calls[0][0];
    expect(typeof createdToken.tokenHash).toBe('string');
    expect(createdToken.tokenHash).toHaveLength(64);
    const expiresAt: Date = createdToken.expiresAt;
    const fiveMinutesMs = 5 * 60 * 1000;
    expect(Math.abs(expiresAt.getTime() - (Date.now() + fiveMinutesMs))).toBeLessThanOrEqual(5000);
    expect(mail.enqueueVerificationEmail).toHaveBeenCalledTimes(1);
    const { toEmail, verifyUrl } = (mail.enqueueVerificationEmail as jest.Mock).mock.calls[0][0];
    expect(toEmail).toBe('user+x@example.com');
    expect(verifyUrl).toMatch(/^https:\/\/app\.local\/verify-email\?token=.+/);
  });

  it('throws ConflictException when email already exists', async () => {
    usersRepo.findOne!.mockResolvedValue({ id: 'u1' });
    await expect(
      service.register({ email: 'dup@example.com', password: 'Str0ng!Pass' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersRepo.save).not.toHaveBeenCalled();
    expect(tokensRepo.save).not.toHaveBeenCalled();
    expect(mail.enqueueVerificationEmail).not.toHaveBeenCalled();
  });

  it('rejects weak password: length < 8', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    await expect(
      service.register({ email: 'a@b.com', password: 'Ab1!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects weak password: missing lowercase', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    await expect(
      service.register({ email: 'a@b.com', password: 'STRONG1!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects weak password: missing uppercase', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    await expect(
      service.register({ email: 'a@b.com', password: 'strong1!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects weak password: missing number', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    await expect(
      service.register({ email: 'a@b.com', password: 'Strong!!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects weak password: missing special char', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    await expect(
      service.register({ email: 'a@b.com', password: 'Strong12' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes email (trim + lowercase)', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    const hashSpy = jest.spyOn(
      (bcrypt as unknown as { hash: (d: string, r: number) => Promise<string> }),
      'hash',
    ) as unknown as jest.MockedFunction<
      (d: string, r: number) => Promise<string>
    >;
    hashSpy.mockResolvedValue('hashed');
    usersRepo.create!.mockImplementation((d: Partial<UserEntity>) => ({ id: 'id', ...(d as any) }));
    usersRepo.save!.mockImplementation(async (d) => d);
    tokensRepo.create!.mockImplementation((d) => d);
    tokensRepo.save!.mockResolvedValue(undefined);

    await service.register({ email: '  USER+AbC@Example.com  ', password: 'Str0ng!Pass' });
    expect(usersRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user+abc@example.com' }),
    );
  });

  it('propagates hashing failure as BadRequestException', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    const hashSpy = jest.spyOn(
      (bcrypt as unknown as { hash: (d: string, r: number) => Promise<string> }),
      'hash',
    ) as unknown as jest.MockedFunction<
      (d: string, r: number) => Promise<string>
    >;
    hashSpy.mockRejectedValue(new Error('boom'));

    await expect(
      service.register({ email: 'a@b.com', password: 'Str0ng!Pass' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates mail enqueue failure', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    const hashSpy1 = jest.spyOn(
      (bcrypt as unknown as { hash: (d: string, r: number) => Promise<string> }),
      'hash',
    ) as unknown as jest.MockedFunction<
      (d: string, r: number) => Promise<string>
    >;
    hashSpy1.mockResolvedValue('hashed');
    usersRepo.create!.mockImplementation((d: Partial<UserEntity>) => ({ id: 'id', ...(d as any) }));
    usersRepo.save!.mockImplementation(async (d) => d);
    tokensRepo.create!.mockImplementation((d) => d);
    tokensRepo.save!.mockResolvedValue(undefined);
    (mail.enqueueVerificationEmail as jest.Mock).mockRejectedValue(
      new Error('queue down'),
    );

    await expect(
      service.register({ email: 'a@b.com', password: 'Str0ng!Pass' }),
    ).rejects.toThrow('queue down');
  });

  it('maps unique violation on save to ConflictException', async () => {
    usersRepo.findOne!.mockResolvedValue(null);
    const hashSpy2 = jest.spyOn(
      (bcrypt as unknown as { hash: (d: string, r: number) => Promise<string> }),
      'hash',
    ) as unknown as jest.MockedFunction<
      (d: string, r: number) => Promise<string>
    >;
    hashSpy2.mockResolvedValue('hashed');
    usersRepo.create!.mockImplementation((d: Partial<UserEntity>) => ({ id: 'id', ...(d as any) }));
    usersRepo.save!.mockRejectedValue({ code: '23505' });

    await expect(
      service.register({ email: 'dup@example.com', password: 'Str0ng!Pass' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});


