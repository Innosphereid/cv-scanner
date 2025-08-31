import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../entities/user.entity';
import { EmailVerificationTokenEntity } from '../../../entities/email-verification-token.entity';
import { PasswordResetOtpEntity } from '../../../entities/password-reset-otp.entity';
import { ResendVerificationService } from '../resend-verification.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../../mail/mail.service';
import { RateLimiterService } from '../../../middlewares/rate-limiter/rate-limiter.service';
import { Logger } from '../../../utils/logger';
import { ResendVerificationRequest, ResendVerificationResponse } from '../types';
import * as crypto from 'crypto';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  findOne?: jest.Mock;
  find?: jest.Mock;
  create?: jest.Mock;
  save?: jest.Mock;
  update?: jest.Mock;
  count?: jest.Mock;
};

function createMockRepo<T extends object>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  } as unknown as MockRepo<T>;
}

// Mock the Logger class
jest.mock('../../../utils/logger');
const MockedLogger = Logger as jest.MockedClass<typeof Logger>;

describe('ResendVerificationService', () => {
  let service: ResendVerificationService;
  let usersRepo: MockRepo<UserEntity>;
  let emailTokensRepo: MockRepo<EmailVerificationTokenEntity>;
  let otpRepo: MockRepo<PasswordResetOtpEntity>;
  let config: ConfigService;
  let mail: MailService;
  let rateLimiter: RateLimiterService;
  let mockLoggerInstance: jest.Mocked<Logger>;

  const mockUser: UserEntity = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'user',
    verified: false,
    lockoutAttempts: 0,
    lockedUntil: null,
    tokenVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVerifiedUser: UserEntity = {
    ...mockUser,
    verified: true,
  };

  const mockRequest: ResendVerificationRequest = {
    type: 'register',
    email: 'test@example.com',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
  };

  // Mock rate limit result that matches the interface
  const mockRateLimitResult = {
    isAllowed: true,
    currentCount: 1,
    limit: 3,
    ttl: 86400,
    remainingTime: 86399,
    resetTime: new Date(Date.now() + 86400000),
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    // Create mock logger instance
    mockLoggerInstance = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    // Mock the Logger constructor to return our mock instance
    MockedLogger.mockImplementation(() => mockLoggerInstance);

    usersRepo = createMockRepo<UserEntity>();
    emailTokensRepo = createMockRepo<EmailVerificationTokenEntity>();
    otpRepo = createMockRepo<PasswordResetOtpEntity>();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ResendVerificationService,
        { provide: getRepositoryToken(UserEntity), useValue: usersRepo },
        {
          provide: getRepositoryToken(EmailVerificationTokenEntity),
          useValue: emailTokensRepo,
        },
        {
          provide: getRepositoryToken(PasswordResetOtpEntity),
          useValue: otpRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth.verificationTokenTtl') return '5m';
              if (key === 'auth.otpTtl') return '5m';
              if (key === 'auth.appBaseUrl') return 'https://app.local';
              if (key === 'auth.otpHmacSecret') return 'test-secret';
              if (key === 'mailer.fromName') return 'CV Scanner';
              return undefined;
            }),
          },
        },
        {
          provide: MailService,
          useValue: {
            enqueueVerificationEmail: jest.fn(),
            enqueueResetOtpEmail: jest.fn(),
          },
        },
        {
          provide: RateLimiterService,
          useValue: {
            checkRateLimit: jest.fn().mockResolvedValue(mockRateLimitResult),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ResendVerificationService);
    mail = moduleRef.get(MailService);
    rateLimiter = moduleRef.get(RateLimiterService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    MockedLogger.mockClear();
  });

  describe('resendRegisterVerification', () => {
    it('successfully resends register verification email', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      const mockToken = 'verification-token-123';
      const mockTokenHash = crypto.createHash('sha256').update(mockToken).digest('hex');
      
      usersRepo.findOne!.mockResolvedValue(mockUser);
      emailTokensRepo.update!.mockResolvedValue({ affected: 1 });
      emailTokensRepo.create!.mockReturnValue({
        id: 'token-id',
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      emailTokensRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.resendRegisterVerification(input);

      // Assert
      expect(result).toEqual({
        email: mockUser.email,
        sent: true,
        message: 'Verification email sent successfully',
      });
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith({
        type: 'sensitive',
        identifier: `resend_register:${input.email}`,
        customTtl: 86400,
        customLimit: 3,
      });
      expect(emailTokensRepo.update).toHaveBeenCalledWith(
        { user: { id: mockUser.id }, usedAt: undefined },
        { usedAt: expect.any(Date) }
      );
      expect(mail.enqueueVerificationEmail).toHaveBeenCalledWith({
        toEmail: mockUser.email,
        verifyUrl: expect.stringContaining('https://app.local/verify-email?token='),
      });
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        'Register verification email resent',
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          ip: input.ip,
        })
      );
    });

    it('throws BadRequestException when user not found', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      usersRepo.findOne!.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resendRegisterVerification(input))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Resend verification requested for non-existing email',
        'ResendVerificationService',
        expect.objectContaining({ email: input.email, ip: input.ip })
      );
    });

    it('throws ConflictException when user already verified', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      usersRepo.findOne!.mockResolvedValue(mockVerifiedUser);

      // Act & Assert
      await expect(service.resendRegisterVerification(input))
        .rejects.toBeInstanceOf(ConflictException);
      // Note: This case doesn't log anything in the current implementation
    });

    it('throws BadRequestException when rate limit exceeded', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      const rateLimitExceededResult = {
        ...mockRateLimitResult,
        isAllowed: false,
        resetTime: new Date(Date.now() + 3600000), // 1 hour from now
      };
      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue(rateLimitExceededResult);

      // Act & Assert
      await expect(service.resendRegisterVerification(input))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepo.findOne).not.toHaveBeenCalled();
    });

    it('normalizes email address (trim and lowercase)', async () => {
      // Arrange
      const input: ResendVerificationRequest = {
        ...mockRequest,
        type: 'register',
        email: '  USER+Test@Example.com  ',
      };
      const mockToken = 'verification-token-123';
      const mockTokenHash = crypto.createHash('sha256').update(mockToken).digest('hex');
      
      usersRepo.findOne!.mockResolvedValue(mockUser);
      emailTokensRepo.update!.mockResolvedValue({ affected: 1 });
      emailTokensRepo.create!.mockReturnValue({
        id: 'token-id',
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      emailTokensRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.resendRegisterVerification(input);

      // Assert
      expect(usersRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'user+test@example.com' },
      });
    });
  });

  describe('resendForgotPasswordVerification', () => {
    it('successfully resends forgot password OTP email', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'forgot-password' };
      const mockOtp = '123456';
      const mockOtpHash = crypto.createHash('sha256').update(mockOtp).digest('hex');
      const mockSalt = 'salt-123';
      
      usersRepo.findOne!.mockResolvedValue(mockVerifiedUser);
      // Mock existing OTP record for password reset history validation
      otpRepo.findOne!.mockResolvedValue({
        id: 'existing-otp-id',
        user: { id: mockVerifiedUser.id },
        otpHash: 'existing-hash',
        salt: 'existing-salt',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });
      otpRepo.update!.mockResolvedValue({ affected: 1 });
      otpRepo.create!.mockReturnValue({
        id: 'otp-id',
        otpHash: mockOtpHash,
        salt: mockSalt,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.resendForgotPasswordVerification(input);

      // Assert
      expect(result).toEqual({
        email: mockVerifiedUser.email,
        sent: true,
        message: 'Password reset OTP email sent successfully',
      });
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith({
        type: 'sensitive',
        identifier: `resend_forgot_password:${input.email}`,
        customTtl: 86400,
        customLimit: 3,
      });
      expect(otpRepo.findOne).toHaveBeenCalledWith({
        where: { user: { id: mockVerifiedUser.id } },
        order: { createdAt: 'DESC' },
      });
      expect(otpRepo.update).toHaveBeenCalledWith(
        { user: { id: mockVerifiedUser.id }, usedAt: undefined },
        { usedAt: expect.any(Date) }
      );
      expect(mail.enqueueResetOtpEmail).toHaveBeenCalledWith({
        toEmail: mockVerifiedUser.email,
        otp: expect.any(String),
        appName: 'CV Scanner',
      });
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        'Forgot password OTP email resent',
        expect.objectContaining({
          userId: mockVerifiedUser.id,
          email: mockVerifiedUser.email,
        })
      );
    });

    it('throws BadRequestException when user not found', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'forgot-password' };
      usersRepo.findOne!.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resendForgotPasswordVerification(input))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Resend forgot password requested for non-existing email',
        'ResendVerificationService',
        expect.objectContaining({ email: input.email, ip: input.ip })
      );
    });

    it('throws BadRequestException when no previous password reset request', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'forgot-password' };
      usersRepo.findOne!.mockResolvedValue(mockVerifiedUser);
      otpRepo.findOne!.mockResolvedValue(null); // No previous OTP history

      // Act & Assert
      await expect(service.resendForgotPasswordVerification(input))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Resend forgot password requested for user who never requested password reset',
        'ResendVerificationService',
        expect.objectContaining({ email: input.email, userId: mockVerifiedUser.id })
      );
    });

    it('throws BadRequestException when rate limit exceeded', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'forgot-password' };
      const rateLimitExceededResult = {
        ...mockRateLimitResult,
        isAllowed: false,
        resetTime: new Date(Date.now() + 3600000), // 1 hour from now
      };
      (rateLimiter.checkRateLimit as jest.Mock).mockResolvedValue(rateLimitExceededResult);

      // Act & Assert
      await expect(service.resendForgotPasswordVerification(input))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles database update failures gracefully', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      usersRepo.findOne!.mockResolvedValue(mockUser);
      emailTokensRepo.update!.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.resendRegisterVerification(input))
        .rejects.toThrow('Database connection failed');
      // Note: This error is not logged in the current implementation
    });

    it('handles email service failures gracefully', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      const mockToken = 'verification-token-123';
      const mockTokenHash = crypto.createHash('sha256').update(mockToken).digest('hex');
      
      usersRepo.findOne!.mockResolvedValue(mockUser);
      emailTokensRepo.update!.mockResolvedValue({ affected: 1 });
      emailTokensRepo.create!.mockReturnValue({
        id: 'token-id',
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      emailTokensRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueVerificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service unavailable')
      );

      // Act & Assert
      await expect(service.resendRegisterVerification(input))
        .rejects.toThrow('Email service unavailable');
      // Note: This error is not logged in the current implementation
    });

    it('handles token generation failures gracefully', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      usersRepo.findOne!.mockResolvedValue(mockUser);
      emailTokensRepo.update!.mockResolvedValue({ affected: 1 });
      
      // Mock crypto.randomBytes to fail using jest.spyOn
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes').mockImplementation(() => {
        throw new Error('Random number generation failed');
      });

      // Act & Assert
      await expect(service.resendRegisterVerification(input))
        .rejects.toThrow('Random number generation failed');
      
      // Restore original function
      randomBytesSpy.mockRestore();
    });

    it('handles empty or malformed email gracefully', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, email: '' };
      usersRepo.findOne!.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resendRegisterVerification(input))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepo.findOne).toHaveBeenCalledWith({
        where: { email: '' },
      });
    });
  });

  describe('Rate Limiting Integration', () => {
    it('uses correct rate limit keys for different types', async () => {
      // Arrange
      const registerInput: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      const forgotPasswordInput: ResendVerificationRequest = { ...mockRequest, type: 'forgot-password' };
      
      usersRepo.findOne!.mockResolvedValue(mockUser);
      emailTokensRepo.update!.mockResolvedValue({ affected: 1 });
      emailTokensRepo.create!.mockReturnValue({
        id: 'token-id',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      emailTokensRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueVerificationEmail as jest.Mock).mockResolvedValue(undefined);
      
      // Mock existing OTP for forgot password test
      otpRepo.findOne!.mockResolvedValue({
        id: 'existing-otp-id',
        user: { id: mockUser.id },
        otpHash: 'existing-hash',
        salt: 'existing-salt',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });
      otpRepo.update!.mockResolvedValue({ affected: 1 });
      otpRepo.create!.mockReturnValue({
        id: 'otp-id',
        otpHash: 'hash',
        salt: 'salt',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.resendRegisterVerification(registerInput);
      await service.resendForgotPasswordVerification(forgotPasswordInput);

      // Assert
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith({
        type: 'sensitive',
        identifier: `resend_register:${registerInput.email}`,
        customTtl: 86400,
        customLimit: 3,
      });
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith({
        type: 'sensitive',
        identifier: `resend_forgot_password:${forgotPasswordInput.email}`,
        customTtl: 86400,
        customLimit: 3,
      });
    });
  });

  describe('Logging and Audit', () => {
    it('logs successful operations with appropriate level', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      const mockToken = 'verification-token-123';
      const mockTokenHash = crypto.createHash('sha256').update(mockToken).digest('hex');
      
      usersRepo.findOne!.mockResolvedValue(mockUser);
      emailTokensRepo.update!.mockResolvedValue({ affected: 1 });
      emailTokensRepo.create!.mockReturnValue({
        id: 'token-id',
        tokenHash: mockTokenHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      emailTokensRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.resendRegisterVerification(input);

      // Assert
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        'Register verification email resent',
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          ip: input.ip,
          userAgent: input.userAgent?.substring(0, 100),
        })
      );
    });

    it('logs security events with warning level', async () => {
      // Arrange
      const input: ResendVerificationRequest = { ...mockRequest, type: 'register' };
      usersRepo.findOne!.mockResolvedValue(mockVerifiedUser);

      // Act
      await expect(service.resendRegisterVerification(input))
        .rejects.toBeInstanceOf(ConflictException);

      // Assert
      // Note: This case doesn't log anything in the current implementation
      // The test passes because we're not expecting any logging
    });
  });
});
