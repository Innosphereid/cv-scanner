import { HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../entities/user.entity';
import { PasswordResetOtpEntity } from '../../../entities/password-reset-otp.entity';
import { ForgotPasswordService } from '../forgot-password.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../../mail/mail.service';
import { ForgotPasswordRequest } from '../types';
import * as crypto from '../../../utils/crypto';

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

describe('ForgotPasswordService', () => {
  let service: ForgotPasswordService;
  let usersRepo: MockRepo<UserEntity>;
  let otpRepo: MockRepo<PasswordResetOtpEntity>;
  let config: ConfigService;
  let mail: MailService;

  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'john.doe@example.com',
    passwordHash: 'hashed-password',
    role: 'user',
    verified: true,
    tokenVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest: ForgotPasswordRequest = {
    email: 'john.doe@example.com',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T10:00:00.000Z'));

    usersRepo = createMockRepo<UserEntity>();
    otpRepo = createMockRepo<PasswordResetOtpEntity>();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ForgotPasswordService,
        { provide: getRepositoryToken(UserEntity), useValue: usersRepo },
        {
          provide: getRepositoryToken(PasswordResetOtpEntity),
          useValue: otpRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth.otpHmacSecret') return 'test-secret-key';
              if (key === 'mailer.fromName') return 'CV Scanner';
              return undefined;
            }),
          },
        },
        {
          provide: MailService,
          useValue: { enqueueResetOtpEmail: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(ForgotPasswordService);
    mail = moduleRef.get(MailService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Scenario 1: Successful OTP Request', () => {
    it('should generate OTP and send email successfully', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      const mockOtp = '123456';
      const mockHashResult = { otpHash: 'hashed-otp', salt: 'test-salt' };
      
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue(mockOtp);
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue(mockHashResult);
      
      otpRepo.create!.mockImplementation((data: Partial<PasswordResetOtpEntity>) => ({
        ...data,
        id: '22222222-2222-2222-2222-222222222222',
      }));
      otpRepo.save!.mockImplementation(async (data) => data);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.requestReset(mockRequest);

      // Assert
      expect(result).toEqual({ email: mockUser.email, sent: true });
      expect(usersRepo.findOne).toHaveBeenCalledWith({ where: { email: 'john.doe@example.com' } });
      expect(crypto.generateNumericOtp).toHaveBeenCalledWith(6);
      expect(crypto.hashOtpHmacSha256).toHaveBeenCalledWith(mockOtp, 'test-secret-key');
      
      const createdOtp = (otpRepo.create as jest.Mock).mock.calls[0][0];
      expect(createdOtp.user).toEqual(mockUser);
      expect(createdOtp.otpHash).toBe('hashed-otp');
      expect(createdOtp.salt).toBe('test-salt');
      expect(createdOtp.usedAt).toBeNull();
      
      // Check expiration time (5 minutes from now)
      const expectedExpiry = new Date(Date.now() + 5 * 60 * 1000);
      expect(Math.abs(createdOtp.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThanOrEqual(1000);
      
      expect(otpRepo.save).toHaveBeenCalledTimes(1);
      expect(mail.enqueueResetOtpEmail).toHaveBeenCalledWith({
        toEmail: mockUser.email,
        otp: mockOtp,
        appName: 'CV Scanner',
      });
    });
  });

  describe('Scenario 2: Rate Limit Exceeded', () => {
    it('should handle rate limiting (handled by middleware)', async () => {
      // This scenario is handled by rate limiting middleware
      // Service should still process requests normally
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.requestReset(mockRequest);
      expect(result.sent).toBe(true);
    });
  });

  describe('Scenario 3: User Not Found', () => {
    it('should throw HttpException when email is not registered', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(null);

      // Act & Assert
      await expect(service.requestReset(mockRequest)).rejects.toThrow(
        new HttpException('Email not registered', HttpStatus.BAD_REQUEST)
      );
      
      expect(otpRepo.create).not.toHaveBeenCalled();
      expect(otpRepo.save).not.toHaveBeenCalled();
      expect(mail.enqueueResetOtpEmail).not.toHaveBeenCalled();
    });

    it('should log warning with IP address for non-existent email', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(null);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      // Act
      try {
        await service.requestReset(mockRequest);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Forgot password requested for non-existing email',
        'ForgotPasswordService',
        { email: 'john.doe@example.com', ip: '192.168.1.1' }
      );
    });
  });

  describe('Scenario 4-7: Input Validation and Normalization', () => {
    it('should normalize email by trimming whitespace and converting to lowercase', async () => {
      // Arrange
      const requestWithWhitespace: ForgotPasswordRequest = {
        ...mockRequest,
        email: '  JOHN.DOE@EXAMPLE.COM  ',
      };
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.requestReset(requestWithWhitespace);

      // Assert
      expect(usersRepo.findOne).toHaveBeenCalledWith({ where: { email: 'john.doe@example.com' } });
    });

    it('should handle mixed case email correctly', async () => {
      // Arrange
      const requestWithMixedCase: ForgotPasswordRequest = {
        ...mockRequest,
        email: 'John.Doe@EXAMPLE.com',
      };
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.requestReset(requestWithMixedCase);

      // Assert
      expect(usersRepo.findOne).toHaveBeenCalledWith({ where: { email: 'john.doe@example.com' } });
    });
  });

  describe('Scenario 8: Database Connection Failure', () => {
    it('should propagate database findOne failure', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      usersRepo.findOne!.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.requestReset(mockRequest)).rejects.toThrow(dbError);
    });

    it('should propagate database save failure', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      
      const saveError = new Error('Save operation failed');
      otpRepo.save!.mockRejectedValue(saveError);

      // Act & Assert
      await expect(service.requestReset(mockRequest)).rejects.toThrow(saveError);
    });
  });

  describe('Scenario 9: Email Service Unavailable', () => {
    it('should propagate email service failure', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      
      const emailError = new Error('Email service unavailable');
      (mail.enqueueResetOtpEmail as jest.Mock).mockRejectedValue(emailError);

      // Act & Assert
      await expect(service.requestReset(mockRequest)).rejects.toThrow(emailError);
    });
  });

  describe('Scenario 10: Concurrent OTP Requests', () => {
    it('should handle concurrent requests independently', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      const promises = [
        service.requestReset(mockRequest),
        service.requestReset(mockRequest),
        service.requestReset(mockRequest),
      ];

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.sent).toBe(true);
        expect(result.email).toBe(mockUser.email);
      });
      
      expect(otpRepo.create).toHaveBeenCalledTimes(3);
      expect(otpRepo.save).toHaveBeenCalledTimes(3);
      expect(mail.enqueueResetOtpEmail).toHaveBeenCalledTimes(3);
    });
  });

  describe('Scenario 11: OTP Generation Failure', () => {
    it('should propagate OTP generation failure', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      const otpError = new Error('OTP generation failed');
      jest.spyOn(crypto, 'generateNumericOtp').mockImplementation(() => {
        throw otpError;
      });

      // Act & Assert
      await expect(service.requestReset(mockRequest)).rejects.toThrow(otpError);
    });
  });

  describe('Scenario 12: Database Save Failure', () => {
    it('should propagate database save failure', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      
      const saveError = new Error('Database save failed');
      otpRepo.save!.mockRejectedValue(saveError);

      // Act & Assert
      await expect(service.requestReset(mockRequest)).rejects.toThrow(saveError);
      expect(mail.enqueueResetOtpEmail).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 13: Email Enqueue Failure', () => {
    it('should propagate email enqueue failure', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      
      const enqueueError = new Error('Email queue service unavailable');
      (mail.enqueueResetOtpEmail as jest.Mock).mockRejectedValue(enqueueError);

      // Act & Assert
      await expect(service.requestReset(mockRequest)).rejects.toThrow(enqueueError);
    });
  });

  describe('Scenario 14-16: Request Metadata Handling', () => {
    it('should handle missing IP address gracefully', async () => {
      // Arrange
      const requestWithoutIp: ForgotPasswordRequest = {
        ...mockRequest,
        ip: '',
      };
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.requestReset(requestWithoutIp);

      // Assert
      expect(result.sent).toBe(true);
    });

    it('should handle missing user agent gracefully', async () => {
      // Arrange
      const requestWithoutUserAgent: ForgotPasswordRequest = {
        ...mockRequest,
        userAgent: '',
      };
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.requestReset(requestWithoutUserAgent);

      // Assert
      expect(result.sent).toBe(true);
    });

    it('should truncate long user agent to 100 characters in logging', async () => {
      // Arrange
      const longUserAgent = 'A'.repeat(150);
      const requestWithLongUserAgent: ForgotPasswordRequest = {
        ...mockRequest,
        userAgent: longUserAgent,
      };
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);
      
      const loggerSpy = jest.spyOn(service['logger'], 'info');

      // Act
      await service.requestReset(requestWithLongUserAgent);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Forgot password OTP generated and email enqueued',
        expect.objectContaining({
          userAgent: 'A'.repeat(100),
        })
      );
    });
  });

  describe('Scenario 17-18: OTP Security Features', () => {
    it('should generate 6-digit OTP', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      const mockOtp = '123456';
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue(mockOtp);
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.requestReset(mockRequest);

      // Assert
      expect(crypto.generateNumericOtp).toHaveBeenCalledWith(6);
    });

    it('should hash OTP using HMAC-SHA256 with salt', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      const mockOtp = '123456';
      const mockHashResult = { otpHash: 'hashed-otp', salt: 'test-salt' };
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue(mockOtp);
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue(mockHashResult);
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.requestReset(mockRequest);

      // Assert
      expect(crypto.hashOtpHmacSha256).toHaveBeenCalledWith(mockOtp, 'test-secret-key');
      
      const createdOtp = (otpRepo.create as jest.Mock).mock.calls[0][0];
      expect(createdOtp.otpHash).toBe('hashed-otp');
      expect(createdOtp.salt).toBe('test-salt');
    });

    it('should set OTP expiration to 5 minutes from creation', async () => {
      // Arrange
      const fixedTime = new Date('2025-01-01T10:00:00.000Z');
      jest.setSystemTime(fixedTime);
      
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.requestReset(mockRequest);

      // Assert
      const createdOtp = (otpRepo.create as jest.Mock).mock.calls[0][0];
      const expectedExpiry = new Date(fixedTime.getTime() + 5 * 60 * 1000);
      expect(createdOtp.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe('Scenario 19: Multiple OTPs for Same User', () => {
    it('should allow multiple OTPs for the same user', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act - Request multiple OTPs
      await service.requestReset(mockRequest);
      await service.requestReset(mockRequest);
      await service.requestReset(mockRequest);

      // Assert
      expect(otpRepo.create).toHaveBeenCalledTimes(3);
      expect(otpRepo.save).toHaveBeenCalledTimes(3);
      expect(mail.enqueueResetOtpEmail).toHaveBeenCalledTimes(3);
    });
  });

  describe('Scenario 20: Audit Logging', () => {
    it('should log successful OTP generation with correct metadata', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);
      
      const loggerSpy = jest.spyOn(service['logger'], 'info');

      // Act
      await service.requestReset(mockRequest);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        'Forgot password OTP generated and email enqueued',
        {
          userId: mockUser.id,
          email: mockUser.email,
          ip: mockRequest.ip,
          userAgent: mockRequest.userAgent.substring(0, 100),
        }
      );
    });
  });

  describe('Configuration and Dependencies', () => {
    it('should use configured HMAC secret from config', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.requestReset(mockRequest);

      // Assert
      expect(crypto.hashOtpHmacSha256).toHaveBeenCalledWith('123456', 'test-secret-key');
    });

    it('should use configured app name from config', async () => {
      // Arrange
      usersRepo.findOne!.mockResolvedValue(mockUser);
      jest.spyOn(crypto, 'generateNumericOtp').mockReturnValue('123456');
      jest.spyOn(crypto, 'hashOtpHmacSha256').mockReturnValue({ otpHash: 'hash', salt: 'salt' });
      otpRepo.create!.mockImplementation((data) => data);
      otpRepo.save!.mockResolvedValue(undefined);
      (mail.enqueueResetOtpEmail as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.requestReset(mockRequest);

      // Assert
      expect(mail.enqueueResetOtpEmail).toHaveBeenCalledWith({
        toEmail: mockUser.email,
        otp: '123456',
        appName: 'CV Scanner',
      });
    });
  });
});
