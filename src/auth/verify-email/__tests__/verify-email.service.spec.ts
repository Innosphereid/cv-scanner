import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerificationTokenEntity } from '../../../entities/email-verification-token.entity';
import { UserEntity } from '../../../entities/user.entity';
import { VerifyEmailService } from '../verify-email.service';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  findOne?: jest.Mock;
  save?: jest.Mock;
};

function createMockRepo<T extends object>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
  } as unknown as MockRepo<T>;
}

describe('VerifyEmailService', () => {
  let service: VerifyEmailService;
  let evRepo: MockRepo<EmailVerificationTokenEntity>;
  let usersRepo: MockRepo<UserEntity>;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    evRepo = createMockRepo<EmailVerificationTokenEntity>();
    usersRepo = createMockRepo<UserEntity>();

    const moduleRef = await Test.createTestingModule({
      providers: [
        VerifyEmailService,
        { provide: getRepositoryToken(EmailVerificationTokenEntity), useValue: evRepo },
        { provide: getRepositoryToken(UserEntity), useValue: usersRepo },
      ],
    }).compile();

    service = moduleRef.get(VerifyEmailService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('verifies successfully', async () => {
    const user: UserEntity = {
      id: 'u1',
      email: 'user@example.com',
      passwordHash: 'hash',
      role: 'user',
      verified: false,
      lockoutAttempts: 0,
      lockedUntil: null,
      tokenVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as UserEntity;

    evRepo.findOne!.mockResolvedValue({
      id: 't1',
      tokenHash: 'x',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user,
    });
    usersRepo.save!.mockImplementation(async (u: UserEntity) => u);
    evRepo.save!.mockImplementation(async (t: EmailVerificationTokenEntity) => t);

    const res = await service.verify({ token: 'rawtoken' });
    expect(res).toEqual({ email: 'user@example.com', verified: true });
    expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ verified: true }));
    expect(evRepo.save).toHaveBeenCalledWith(expect.objectContaining({ usedAt: expect.any(Date) }));
  });

  it('throws when token not found', async () => {
    evRepo.findOne!.mockResolvedValue(null);
    await expect(service.verify({ token: 'zzz' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when token already used', async () => {
    evRepo.findOne!.mockResolvedValue({ usedAt: new Date(), user: {} } as any);
    await expect(service.verify({ token: 'raw' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when token expired', async () => {
    evRepo.findOne!.mockResolvedValue({
      expiresAt: new Date(Date.now() - 1),
      usedAt: null,
      user: {},
    } as any);
    await expect(service.verify({ token: 'raw' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});


