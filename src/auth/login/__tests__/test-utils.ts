import { UserEntity } from '../../../entities/user.entity';
import { LoginRequest, LoginResponse } from '../types';

// Test data constants
export const TEST_CONSTANTS = {
  USER_ID: '550e8400-e29b-41d4-a716-446655440000',
  EMAIL: 'user@example.com',
  PASSWORD: 'ValidPassword123!',
  PASSWORD_HASH: '$2b$12$hashedPassword123',
  ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  IP_ADDRESS: '192.168.1.1',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  REQUEST_ID: 'req-123',
  EXECUTION_TIME: 150,
} as const;

// Mock user entity factory
export const createMockUser = (
  overrides: Partial<UserEntity> = {},
): UserEntity =>
  ({
    id: TEST_CONSTANTS.USER_ID,
    email: TEST_CONSTANTS.EMAIL,
    passwordHash: TEST_CONSTANTS.PASSWORD_HASH,
    role: 'user',
    verified: true,
    lockoutAttempts: 0,
    lockedUntil: null,
    tokenVersion: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }) as UserEntity;

// Mock login request factory
export const createMockLoginRequest = (
  overrides: Partial<LoginRequest> = {},
): LoginRequest => ({
  email: TEST_CONSTANTS.EMAIL,
  password: TEST_CONSTANTS.PASSWORD,
  ...overrides,
});

// Mock login response factory
export const createMockLoginResponse = (
  overrides: Partial<LoginResponse> = {},
): LoginResponse => ({
  userId: TEST_CONSTANTS.USER_ID,
  email: TEST_CONSTANTS.EMAIL,
  role: 'user',
  accessToken: TEST_CONSTANTS.ACCESS_TOKEN,
  ...overrides,
});

// Mock request factory
export const createMockRequest = (overrides: any = {}) => ({
  body: {
    email: TEST_CONSTANTS.EMAIL,
    password: TEST_CONSTANTS.PASSWORD,
  },
  requestMetadata: {
    request_id: TEST_CONSTANTS.REQUEST_ID,
    execution_time: TEST_CONSTANTS.EXECUTION_TIME,
  },
  get: jest.fn().mockReturnValue(TEST_CONSTANTS.USER_AGENT),
  socket: { remoteAddress: TEST_CONSTANTS.IP_ADDRESS },
  ...overrides,
});

// Mock response factory
export const createMockResponse = () => ({
  cookie: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

// Mock builders
export const createMockSuccessBuilder = () => ({
  message: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  metadata: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ success: true }),
});

export const createMockErrorBuilder = () => ({
  message: jest.fn().mockReturnThis(),
  errors: jest.fn().mockReturnThis(),
  metadata: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ success: false }),
});

// Test scenarios data
export const TEST_SCENARIOS = {
  EMAIL_NORMALIZATION: [
    { input: ' USER@EXAMPLE.COM ', expected: 'user@example.com' },
    { input: 'User@Example.Com', expected: 'user@example.com' },
    { input: '  user@example.com  ', expected: 'user@example.com' },
  ],
  JWT_TTL_PARSING: [
    { input: '15m', expected: 15 * 60 },
    { input: '2h', expected: 2 * 60 * 60 },
    { input: '1d', expected: 24 * 60 * 60 },
    { input: 'invalid', expected: 15 * 60 },
    { input: '30s', expected: 15 * 60 },
  ],
  IP_DETECTION: {
    X_FORWARDED_FOR: '192.168.1.100, 10.0.0.1',
    X_REAL_IP: '172.16.0.100',
    SOCKET_REMOTE: '192.168.1.50',
  },
} as const;

// Helper functions
export const mockDate = (dateString: string) => {
  const mockDate = new Date(dateString);
  return jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
};

export const restoreDate = () => {
  jest.restoreAllMocks();
};

export const setEnvironment = (env: 'development' | 'production') => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = env;
  return () => {
    process.env.NODE_ENV = originalEnv;
  };
};
