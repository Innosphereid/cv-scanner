import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Logger } from './utils/logger';

// Mock the entire rate-limiter module before importing AppController
jest.mock('./middlewares/rate-limiter', () => {
  const mockRateLimit = () => () => {};
  const mockRateLimitGeneral = () => () => {};
  const mockRateLimitSensitive = () => () => {};
  const mockRateLimitInterceptor = class MockRateLimitInterceptor {
    intercept() {}
  };

  return {
    RateLimit: mockRateLimit,
    RateLimitGeneral: mockRateLimitGeneral,
    RateLimitSensitive: mockRateLimitSensitive,
    RateLimitInterceptor: mockRateLimitInterceptor,
  };
});

describe('AppController', () => {
  let appController: AppController;
  let mockAppService: Partial<AppService>;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    // Create mock services
    mockAppService = {
      getHello: jest.fn().mockReturnValue('Hello World!'),
      getError: jest.fn().mockImplementation(() => {
        throw new Error('Service error');
      }),
      getDebug: jest.fn().mockReturnValue('Debug message'),
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Create controller instance directly
    appController = new AppController(
      mockAppService as AppService,
      mockLogger as Logger,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // Execute
      const result = appController.getHello();

      // Assert
      expect(result).toBe('Hello World!');
      expect(mockAppService.getHello).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('GET / endpoint accessed');
    });
  });

  describe('error', () => {
    it('should throw HttpException when service throws error', () => {
      // Execute & Assert
      expect(() => appController.getError()).toThrow();
      expect(mockLogger.warn).toHaveBeenCalledWith('Error endpoint accessed - this will throw an error');
    });
  });

  describe('debug', () => {
    it('should return debug message', () => {
      // Execute
      const result = appController.getDebug();

      // Assert
      expect(result).toBe('Debug message');
      expect(mockAppService.getDebug).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Debug endpoint accessed');
    });
  });

  describe('metadata', () => {
    it('should return metadata with logging', () => {
      // Execute
      const result = appController.getMetadata();

      // Assert
      expect(result).toHaveProperty('message', 'Metadata logged successfully');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('requestId');
      expect(result.metadata).toHaveProperty('userId', 'demo-user');
      expect(result.metadata).toHaveProperty('action', 'get_metadata');
      expect(result.metadata).toHaveProperty('timestamp');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Metadata endpoint accessed with custom metadata',
        expect.any(Object),
      );
    });
  });
});
