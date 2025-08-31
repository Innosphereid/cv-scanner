// Global test setup for Login Module
import '@nestjs/testing';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock process.env to avoid side effects
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

// Global test timeout
jest.setTimeout(10000);

// Suppress specific warnings during tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('NestFactory.create')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

// Mock Date.now() for consistent testing
const mockDate = new Date('2024-01-01T10:00:00Z');
global.Date.now = jest.fn(() => mockDate.getTime());

// Mock Math.random for consistent testing
global.Math.random = jest.fn(() => 0.5);

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
  },
});
