import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

import { LoginService } from '../login.service';
import { UserEntity } from '../../../entities/user.entity';
import { LockedException } from '../exceptions/locked.exception';
import { LoginRequest, LoginResponse, UserLockoutInfo } from '../types';

// Mock bcrypt module
jest.mock('bcrypt');

describe('LoginService', () => {
  let service: LoginService;
  let usersRepo: Repository<UserEntity>;
  let jwtService: JwtService;
  let configService: ConfigService;

  // Test data constants
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockEmail = 'user@example.com';
  const mockPassword = 'ValidPassword123!';
  const mockPasswordHash = '$2b$12$hashedPassword123';
  const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

  // Mock user entity
  const createMockUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
    id: mockUserId,
    email: mockEmail,
    passwordHash: mockPasswordHash,
    role: 'user',
    verified: true,
    lockoutAttempts: 0,
    lockedUntil: null,
    tokenVersion: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as UserEntity);

  // Mock login request
  const createMockLoginRequest = (overrides: Partial<LoginRequest> = {}): LoginRequest => ({
    email: mockEmail,
    password: mockPassword,
    ...overrides,
  });

  // Mock login response
  const createMockLoginResponse = (overrides: Partial<LoginResponse> = {}): LoginResponse => ({
    userId: mockUserId,
    email: mockEmail,
    role: 'user',
    accessToken: mockAccessToken,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LoginService>(LoginService);
    usersRepo = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('login', () => {
    const mockIp = '192.168.1.1';
    const mockUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

    describe('Scenario 1: Successful Login with Valid Credentials', () => {
      it('should successfully login user with valid credentials', async () => {
        // Arrange
        const mockUser = createMockUser();
        const loginRequest = createMockLoginRequest();
        const expectedResponse = createMockLoginResponse();

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        jest.spyOn(jwtService, 'sign').mockReturnValue(mockAccessToken);
        jest.spyOn(configService, 'get').mockReturnValue('15m');

        // Act
        const result = await service.login(loginRequest, mockIp, mockUserAgent);

        // Assert
        expect(result).toEqual(expectedResponse);
        expect(usersRepo.findOne).toHaveBeenCalledWith({
          where: { email: mockEmail.toLowerCase() },
        });
        expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, mockPasswordHash);
        expect(jwtService.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: mockUserId,
            email: mockEmail,
            role: 'user',
            tokenVersion: 1,
          }),
        );
      });

      it('should reset lockout attempts on successful login if previously locked', async () => {
        // Arrange
        const mockUser = createMockUser({ lockoutAttempts: 3, lockedUntil: new Date() });
        const loginRequest = createMockLoginRequest();

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        jest.spyOn(jwtService, 'sign').mockReturnValue(mockAccessToken);
        jest.spyOn(configService, 'get').mockReturnValue('15m');
        jest.spyOn(usersRepo, 'update').mockResolvedValue({ affected: 1 } as any);

        // Act
        await service.login(loginRequest, mockIp, mockUserAgent);

        // Assert
        expect(usersRepo.update).toHaveBeenCalledWith(mockUserId, {
          lockoutAttempts: 0,
          lockedUntil: null,
        });
      });
    });

    describe('Scenario 2: Login Failed - User Not Found', () => {
      it('should throw UnauthorizedException when user is not found', async () => {
        // Arrange
        const loginRequest = createMockLoginRequest({ email: 'nonexistent@example.com' });

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(null);

        // Act & Assert
        await expect(service.login(loginRequest, mockIp, mockUserAgent)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.login(loginRequest, mockIp, mockUserAgent)).rejects.toThrow(
          'Invalid credentials',
        );

        expect(usersRepo.findOne).toHaveBeenCalledWith({
          where: { email: 'nonexistent@example.com' },
        });
        expect(usersRepo.update).not.toHaveBeenCalled();
      });
    });

    describe('Scenario 3: Login Failed - Email Not Verified', () => {
      it('should throw ForbiddenException when user email is not verified', async () => {
        // Arrange
        const mockUser = createMockUser({ verified: false });
        const loginRequest = createMockLoginRequest();

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);

        // Act & Assert
        await expect(service.login(loginRequest, mockIp, mockUserAgent)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(service.login(loginRequest, mockIp, mockUserAgent)).rejects.toThrow(
          'Please verify your email before logging in',
        );

        expect(usersRepo.findOne).toHaveBeenCalledWith({
          where: { email: mockEmail.toLowerCase() },
        });
        expect(usersRepo.update).not.toHaveBeenCalled();
      });
    });

    describe('Scenario 4: Login Failed - Account Locked', () => {
      it('should throw LockedException when account is locked', async () => {
        // Arrange
        const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        const mockUser = createMockUser({ lockedUntil });
        const loginRequest = createMockLoginRequest();

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);

        // Act & Assert
        await expect(service.login(loginRequest, mockIp, mockUserAgent)).rejects.toThrow(
          LockedException,
        );
        await expect(service.login(loginRequest, mockIp, mockUserAgent)).rejects.toThrow(
          `Account locked until ${lockedUntil.toISOString()}`,
        );

        expect(usersRepo.findOne).toHaveBeenCalledWith({
          where: { email: mockEmail.toLowerCase() },
        });
        expect(usersRepo.update).not.toHaveBeenCalled();
      });
    });

    describe('Scenario 5: Login Failed - Wrong Password (Below Lockout Threshold)', () => {
      it('should increment lockout attempts when password is wrong', async () => {
        // Arrange
        const mockUser = createMockUser({ lockoutAttempts: 2 });
        const loginRequest = createMockLoginRequest({ password: 'WrongPassword123!' });

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        jest.spyOn(usersRepo, 'update').mockResolvedValue({ affected: 1 } as any);

        // Act & Assert
        await expect(service.login(loginRequest, mockIp, mockUserAgent)).rejects.toThrow(
          UnauthorizedException,
        );

        expect(usersRepo.update).toHaveBeenCalledWith(mockUserId, {
          lockoutAttempts: 3,
        });
        expect(usersRepo.update).not.toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({ lockedUntil: expect.any(Date) }),
        );
      });
    });

    describe('Scenario 6: Login Failed - Wrong Password (Reaching Lockout Threshold)', () => {
      it('should lock account when lockout threshold is reached', async () => {
        // Arrange
        const mockUser = createMockUser({ lockoutAttempts: 4 });
        const loginRequest = createMockLoginRequest({ password: 'WrongPassword123!' });

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        jest.spyOn(usersRepo, 'update').mockResolvedValue({ affected: 1 } as any);

        // Mock Date to have consistent testing
        const mockDate = new Date('2024-01-01T10:00:00Z');
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

        // Act & Assert
        await expect(service.login(loginRequest, mockIp, mockUserAgent)).rejects.toThrow(
          UnauthorizedException,
        );

        const expectedLockedUntil = new Date(mockDate);
        expectedLockedUntil.setMinutes(expectedLockedUntil.getMinutes() + 15);

        expect(usersRepo.update).toHaveBeenCalledWith(mockUserId, {
          lockoutAttempts: 5,
          lockedUntil: expectedLockedUntil,
        });
      });
    });

    describe('Scenario 7: Successful Login After Lockout (Account Already Unlocked)', () => {
      it('should successfully login and reset lockout when account is unlocked', async () => {
        // Arrange
        const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
        const mockUser = createMockUser({ lockoutAttempts: 3, lockedUntil: pastDate });
        const loginRequest = createMockLoginRequest();
        const expectedResponse = createMockLoginResponse();

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        jest.spyOn(jwtService, 'sign').mockReturnValue(mockAccessToken);
        jest.spyOn(configService, 'get').mockReturnValue('15m');
        jest.spyOn(usersRepo, 'update').mockResolvedValue({ affected: 1 } as any);

        // Act
        const result = await service.login(loginRequest, mockIp, mockUserAgent);

        // Assert
        expect(result).toEqual(expectedResponse);
        expect(usersRepo.update).toHaveBeenCalledWith(mockUserId, {
          lockoutAttempts: 0,
          lockedUntil: null,
        });
      });
    });

    describe('Scenario 8: Login Failed - Error in Password Verification', () => {
      it('should handle bcrypt error gracefully', async () => {
        // Arrange
        const mockUser = createMockUser();
        const loginRequest = createMockLoginRequest();

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('bcrypt error'));
        jest.spyOn(usersRepo, 'update').mockResolvedValue({ affected: 1 } as any);

        // Act & Assert
        await expect(service.login(loginRequest, mockIp, mockUserAgent)).rejects.toThrow(
          UnauthorizedException,
        );

        // When bcrypt.compare throws an error, verifyPassword returns false,
        // which triggers handleFailedLogin and calls usersRepo.update
        expect(usersRepo.update).toHaveBeenCalledWith(mockUserId, {
          lockoutAttempts: 1,
        });
      });
    });

    describe('Email Normalization', () => {
      it.each([
        { input: ' USER@EXAMPLE.COM ', expected: 'user@example.com' },
        { input: 'User@Example.Com', expected: 'user@example.com' },
        { input: '  user@example.com  ', expected: 'user@example.com' },
      ])('should normalize email "$input" to "$expected"', async ({ input, expected }) => {
        // Arrange
        const mockUser = createMockUser({ email: expected });
        const loginRequest = createMockLoginRequest({ email: input });

        jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        jest.spyOn(jwtService, 'sign').mockReturnValue(mockAccessToken);
        jest.spyOn(configService, 'get').mockReturnValue('15m');

        // Act
        await service.login(loginRequest, mockIp, mockUserAgent);

        // Assert
        expect(usersRepo.findOne).toHaveBeenCalledWith({
          where: { email: expected },
        });
      });
    });
  });

  describe('verifyPassword', () => {
    it('should return true when password matches hash', async () => {
      // Arrange
      const plainPassword = 'ValidPassword123!';
      const hashedPassword = '$2b$12$hashedPassword123';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service['verifyPassword'](plainPassword, hashedPassword);

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
    });

    it('should return false when password does not match hash', async () => {
      // Arrange
      const plainPassword = 'WrongPassword123!';
      const hashedPassword = '$2b$12$hashedPassword123';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service['verifyPassword'](plainPassword, hashedPassword);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when bcrypt throws error', async () => {
      // Arrange
      const plainPassword = 'ValidPassword123!';
      const hashedPassword = '$2b$12$hashedPassword123';

      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('bcrypt error'));

      // Act
      const result = await service['verifyPassword'](plainPassword, hashedPassword);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('handleFailedLogin', () => {
    it('should increment lockout attempts when below threshold', async () => {
      // Arrange
      const mockUser = createMockUser({ lockoutAttempts: 2 });

      jest.spyOn(usersRepo, 'update').mockResolvedValue({ affected: 1 } as any);

      // Act
      await service['handleFailedLogin'](mockUser);

      // Assert
      expect(usersRepo.update).toHaveBeenCalledWith(mockUserId, {
        lockoutAttempts: 3,
      });
    });

    it('should lock account when threshold is reached', async () => {
      // Arrange
      const mockUser = createMockUser({ lockoutAttempts: 4 });

      jest.spyOn(usersRepo, 'update').mockResolvedValue({ affected: 1 } as any);

      // Mock Date for consistent testing
      const mockDate = new Date('2024-01-01T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      // Act
      await service['handleFailedLogin'](mockUser);

      // Assert
      const expectedLockedUntil = new Date(mockDate);
      expectedLockedUntil.setMinutes(expectedLockedUntil.getMinutes() + 15);

      expect(usersRepo.update).toHaveBeenCalledWith(mockUserId, {
        lockoutAttempts: 5,
        lockedUntil: expectedLockedUntil,
      });
    });
  });

  describe('resetLockoutAttempts', () => {
    it('should reset lockout attempts and lockedUntil', async () => {
      // Arrange
      const mockUser = createMockUser({ lockoutAttempts: 3, lockedUntil: new Date() });

      jest.spyOn(usersRepo, 'update').mockResolvedValue({ affected: 1 } as any);

      // Act
      await service['resetLockoutAttempts'](mockUser);

      // Assert
      expect(usersRepo.update).toHaveBeenCalledWith(mockUserId, {
        lockoutAttempts: 0,
        lockedUntil: null,
      });
    });
  });

  describe('getUserLockoutInfo', () => {
    it('should return correct lockout info for unlocked user', () => {
      // Arrange
      const mockUser = createMockUser({ lockoutAttempts: 2, lockedUntil: null });

      // Act
      const result = service['getUserLockoutInfo'](mockUser);

      // Assert
      expect(result).toEqual({
        isLocked: false,
        lockedUntil: null,
        remainingAttempts: 3,
        maxAttempts: 5,
      });
    });

    it('should return correct lockout info for locked user', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      const mockUser = createMockUser({ lockoutAttempts: 5, lockedUntil: futureDate });

      // Act
      const result = service['getUserLockoutInfo'](mockUser);

      // Assert
      expect(result).toEqual({
        isLocked: true,
        lockedUntil: futureDate,
        remainingAttempts: 0,
        maxAttempts: 5,
      });
    });

    it('should return correct lockout info for expired lock', () => {
      // Arrange
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      const mockUser = createMockUser({ lockoutAttempts: 5, lockedUntil: pastDate });

      // Act
      const result = service['getUserLockoutInfo'](mockUser);

      // Assert
      expect(result).toEqual({
        isLocked: false,
        lockedUntil: pastDate,
        remainingAttempts: 0,
        maxAttempts: 5,
      });
    });
  });

  describe('generateAccessToken', () => {
    it('should generate JWT token with correct payload', () => {
      // Arrange
      const mockUser = createMockUser();
      const mockToken = 'jwt.token.here';

      jest.spyOn(jwtService, 'sign').mockReturnValue(mockToken);
      jest.spyOn(configService, 'get').mockReturnValue('15m');

      // Mock Date.now() for consistent testing
      const mockTimestamp = 1704067200000; // 2024-01-01T10:00:00Z
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      // Act
      const result = service['generateAccessToken'](mockUser);

      // Assert
      expect(result).toBe(mockToken);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUserId,
        email: mockEmail,
        role: 'user',
        tokenVersion: 1,
        iat: Math.floor(mockTimestamp / 1000),
        exp: Math.floor(mockTimestamp / 1000) + 15 * 60,
      });
    });
  });

  describe('parseJwtTtl', () => {
    it.each([
      { input: '15m', expected: 15 * 60 },
      { input: '2h', expected: 2 * 60 * 60 },
      { input: '1d', expected: 24 * 60 * 60 },
      { input: 'invalid', expected: 15 * 60 }, // fallback
      { input: '30s', expected: 15 * 60 }, // fallback
    ])('should parse TTL "$input" to $expected seconds', ({ input, expected }) => {
      // Act
      const result = service['parseJwtTtl'](input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
