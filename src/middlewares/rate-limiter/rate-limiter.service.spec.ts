import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from './rate-limiter.service';
import { RedisService } from './redis.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    increment: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getTtl: jest.fn(),
    getClient: jest.fn(),
    // Add new pipeline methods
    processRateLimitRequest: jest.fn(),
    getRateLimitStatus: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);

    // Mock configuration
    mockConfigService.get.mockReturnValue({
      general: { ttl: 60, limit: 100 },
      sensitive: { ttl: 60, limit: 30 },
      login: { ttl: 300, limit: 5 },
      upload: { ttl: 3600, limit: 20 },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkRateLimit', () => {
    it('should allow first request and set initial count', async () => {
      const options = { type: 'general' as const, identifier: '192.168.1.1' };

      // Mock the new pipeline method
      mockRedisService.processRateLimitRequest.mockResolvedValue({
        currentCount: 1,
        remainingTime: 60,
        isNewKey: true,
      });

      const result = await service.checkRateLimit(options);

      expect(result.isAllowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.limit).toBe(100);
      expect(mockRedisService.processRateLimitRequest).toHaveBeenCalledWith(
        'rate-limit:general:192.168.1.1',
        60,
      );
    });

    it('should increment existing count and allow request within limit', async () => {
      const options = { type: 'sensitive' as const, identifier: '192.168.1.1' };

      // Mock the new pipeline method
      mockRedisService.processRateLimitRequest.mockResolvedValue({
        currentCount: 16,
        remainingTime: 45,
        isNewKey: false,
      });

      const result = await service.checkRateLimit(options);

      expect(result.isAllowed).toBe(true);
      expect(result.currentCount).toBe(16);
      expect(result.limit).toBe(30);
      expect(mockRedisService.processRateLimitRequest).toHaveBeenCalledWith(
        'rate-limit:sensitive:192.168.1.1',
        60,
      );
    });

    it('should deny request when limit exceeded', async () => {
      const options = { type: 'login' as const, identifier: '192.168.1.1' };

      // Mock the new pipeline method with exceeded limit
      mockRedisService.processRateLimitRequest.mockResolvedValue({
        currentCount: 6,
        remainingTime: 240,
        isNewKey: false,
      });

      const result = await service.checkRateLimit(options);

      expect(result.isAllowed).toBe(false);
      expect(result.currentCount).toBe(6);
      expect(result.limit).toBe(5);
    });

    it('should handle custom TTL and limit', async () => {
      const options = {
        type: 'general' as const,
        identifier: '192.168.1.1',
        customTtl: 120,
        customLimit: 50,
      };

      // Mock the new pipeline method
      mockRedisService.processRateLimitRequest.mockResolvedValue({
        currentCount: 1,
        remainingTime: 120,
        isNewKey: true,
      });

      const result = await service.checkRateLimit(options);

      expect(result.limit).toBe(50);
      expect(result.ttl).toBe(120);
      expect(mockRedisService.processRateLimitRequest).toHaveBeenCalledWith(
        'rate-limit:general:192.168.1.1',
        120,
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const options = { type: 'general' as const, identifier: '192.168.1.1' };

      mockRedisService.processRateLimitRequest.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.checkRateLimit(options);

      expect(result.isAllowed).toBe(true); // Fallback to allow
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(100);
    });
  });

  describe('resolveConfiguration', () => {
    it('should return default config when no custom values provided', () => {
      const options = { type: 'sensitive' as const, identifier: '192.168.1.1' };
      
      // Access private method through any type
      const result = (service as any).resolveConfiguration(options);
      
      expect(result.ttl).toBe(60);
      expect(result.limit).toBe(30);
    });

    it('should return custom config when provided', () => {
      const options = {
        type: 'sensitive' as const,
        identifier: '192.168.1.1',
        customTtl: 300,
        customLimit: 100,
      };
      
      const result = (service as any).resolveConfiguration(options);
      
      expect(result.ttl).toBe(300);
      expect(result.limit).toBe(100);
    });
  });

  describe('processRequest', () => {
    it('should handle first request correctly', async () => {
      const key = 'rate-limit:general:192.168.1.1';
      const ttl = 60;

      // Mock the new pipeline method
      mockRedisService.processRateLimitRequest.mockResolvedValue({
        currentCount: 1,
        remainingTime: 60,
        isNewKey: true,
      });

      const result = await (service as any).processRequest(key, ttl);

      expect(result).toEqual({
        currentCount: 1,
        remainingTime: 60,
      });
      expect(mockRedisService.processRateLimitRequest).toHaveBeenCalledWith(key, ttl);
    });

    it('should handle existing request correctly', async () => {
      const key = 'rate-limit:general:192.168.1.1';
      const ttl = 60;

      // Mock the new pipeline method
      mockRedisService.processRateLimitRequest.mockResolvedValue({
        currentCount: 6,
        remainingTime: 45,
        isNewKey: false,
      });

      const result = await (service as any).processRequest(key, ttl);

      expect(result).toEqual({
        currentCount: 6,
        remainingTime: 45,
      });
      expect(mockRedisService.processRateLimitRequest).toHaveBeenCalledWith(key, ttl);
    });
  });

  describe('calculateRateLimitResult', () => {
    it('should calculate result correctly for allowed request', async () => {
      const currentCount = 5;
      const config = { ttl: 60, limit: 100 };
      const remainingTime = 45;

      const result = (service as any).calculateRateLimitResult(
        currentCount,
        config,
        remainingTime
      );

      expect(result.isAllowed).toBe(true);
      expect(result.currentCount).toBe(5);
      expect(result.limit).toBe(100);
      expect(result.ttl).toBe(60);
      expect(result.remainingTime).toBe(45);
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('should calculate result correctly for blocked request', async () => {
      const currentCount = 101;
      const config = { ttl: 60, limit: 100 };
      const remainingTime = 30;

      const result = (service as any).calculateRateLimitResult(
        currentCount,
        config,
        remainingTime
      );

      expect(result.isAllowed).toBe(false);
      expect(result.currentCount).toBe(101);
      expect(result.limit).toBe(100);
    });
  });

  describe('handleRateLimitError', () => {
    it('should return fallback result when error occurs', () => {
      const error = new Error('Redis connection failed');
      const options = { type: 'general' as const, identifier: '192.168.1.1' };
      const config = { ttl: 60, limit: 100 };

      const result = (service as any).handleRateLimitError(error, options, config);

      expect(result.isAllowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(100);
      expect(result.ttl).toBe(60);
      expect(result.remainingTime).toBe(0);
      expect(result.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return status without incrementing count', async () => {
      const options = { type: 'general' as const, identifier: '192.168.1.1' };

      // Mock the new pipeline method
      mockRedisService.getRateLimitStatus.mockResolvedValue({
        currentCount: 25,
        remainingTime: 30,
      });

      const result = await service.getRateLimitStatus(options);

      expect(result.isAllowed).toBe(true);
      expect(result.currentCount).toBe(25);
      expect(result.limit).toBe(100);
      expect(mockRedisService.getRateLimitStatus).toHaveBeenCalledWith(
        'rate-limit:general:192.168.1.1'
      );
    });
  });

  describe('resetRateLimit', () => {
    it('should delete rate limit key', async () => {
      const type = 'general';
      const identifier = '192.168.1.1';

      mockRedisService.delete.mockResolvedValue(undefined);

      await service.resetRateLimit(type, identifier);

      expect(mockRedisService.delete).toHaveBeenCalledWith(
        'rate-limit:general:192.168.1.1'
      );
    });
  });

  describe('getConfigForType', () => {
    it('should return correct config for each type', () => {
      expect((service as any).getConfigForType('login')).toEqual({ ttl: 300, limit: 5 });
      expect((service as any).getConfigForType('sensitive')).toEqual({ ttl: 60, limit: 30 });
      expect((service as any).getConfigForType('upload')).toEqual({ ttl: 3600, limit: 20 });
      expect((service as any).getConfigForType('general')).toEqual({ ttl: 60, limit: 100 });
      expect((service as any).getConfigForType('unknown')).toEqual({ ttl: 60, limit: 100 });
    });
  });

  describe('generateKey', () => {
    it('should generate correct Redis key', () => {
      const result = (service as any).generateKey('login', '192.168.1.1');
      expect(result).toBe('rate-limit:login:192.168.1.1');
    });
  });

  describe('isHealthy', () => {
    it('should return true when Redis is healthy', async () => {
      const mockClient = { ping: jest.fn().mockResolvedValue('PONG') };
      mockRedisService.getClient.mockReturnValue(mockClient);

      const result = await service.isHealthy();

      expect(result).toBe(true);
      expect(mockClient.ping).toHaveBeenCalled();
    });

    it('should return false when Redis is unhealthy', async () => {
      const mockClient = { ping: jest.fn().mockRejectedValue(new Error('Connection failed')) };
      mockRedisService.getClient.mockReturnValue(mockClient);

      const result = await service.isHealthy();

      expect(result).toBe(false);
    });
  });
});
