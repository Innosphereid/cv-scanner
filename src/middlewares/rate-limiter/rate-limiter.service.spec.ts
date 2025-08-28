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

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.getTtl.mockResolvedValue(60);

      const result = await service.checkRateLimit(options);

      expect(result.isAllowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.limit).toBe(100);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'rate-limit:general:192.168.1.1',
        1,
        60,
      );
    });

    it('should increment existing count and allow request within limit', async () => {
      const options = { type: 'sensitive' as const, identifier: '192.168.1.1' };

      mockRedisService.get.mockResolvedValue(15);
      mockRedisService.increment.mockResolvedValue(16);
      mockRedisService.getTtl.mockResolvedValue(45);

      const result = await service.checkRateLimit(options);

      expect(result.isAllowed).toBe(true);
      expect(result.currentCount).toBe(16);
      expect(result.limit).toBe(30);
      expect(mockRedisService.increment).toHaveBeenCalledWith(
        'rate-limit:sensitive:192.168.1.1',
        60,
      );
    });

    it('should deny request when limit exceeded', async () => {
      const options = { type: 'login' as const, identifier: '192.168.1.1' };

      mockRedisService.get.mockResolvedValue(5);
      mockRedisService.increment.mockResolvedValue(6);
      mockRedisService.getTtl.mockResolvedValue(240);

      const result = await service.checkRateLimit(options);

      expect(result.isAllowed).toBe(false);
      expect(result.currentCount).toBe(6);
      expect(result.limit).toBe(5);
    });

    it('should handle Redis errors gracefully', async () => {
      const options = { type: 'general' as const, identifier: '192.168.1.1' };

      mockRedisService.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.checkRateLimit(options);

      expect(result.isAllowed).toBe(true); // Fallback to allow
      expect(result.currentCount).toBe(0);
    });

    it('should use custom TTL and limit when provided', async () => {
      const options = {
        type: 'general' as const,
        identifier: '192.168.1.1',
        customTtl: 120,
        customLimit: 50,
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.getTtl.mockResolvedValue(120);

      const result = await service.checkRateLimit(options);

      expect(result.ttl).toBe(120);
      expect(result.limit).toBe(50);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'rate-limit:general:192.168.1.1',
        1,
        120,
      );
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return current rate limit status without incrementing', async () => {
      const options = { type: 'upload' as const, identifier: '192.168.1.1' };

      mockRedisService.get.mockResolvedValue(15);
      mockRedisService.getTtl.mockResolvedValue(1800);

      const result = await service.getRateLimitStatus(options);

      expect(result.currentCount).toBe(15);
      expect(result.limit).toBe(20);
      expect(result.isAllowed).toBe(true);
      expect(mockRedisService.increment).not.toHaveBeenCalled();
    });
  });

  describe('resetRateLimit', () => {
    it('should delete rate limit key for given type and identifier', async () => {
      const type = 'login';
      const identifier = '192.168.1.1';

      mockRedisService.delete.mockResolvedValue(undefined);

      await service.resetRateLimit(type, identifier);

      expect(mockRedisService.delete).toHaveBeenCalledWith(
        'rate-limit:login:192.168.1.1',
      );
    });
  });

  describe('getConfigurations', () => {
    it('should return current rate limit configurations', () => {
      const config = service.getConfigurations();

      expect(config.general.limit).toBe(100);
      expect(config.sensitive.limit).toBe(30);
      expect(config.login.limit).toBe(5);
      expect(config.upload.limit).toBe(20);
    });
  });

  describe('isHealthy', () => {
    it('should return true when Redis is healthy', async () => {
      const mockRedisClient = {
        ping: jest.fn().mockResolvedValue('PONG'),
      };
      mockRedisService.getClient.mockReturnValue(mockRedisClient as any);

      const result = await service.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when Redis is unhealthy', async () => {
      const mockRedisClient = {
        ping: jest.fn().mockRejectedValue(new Error('Connection failed')),
      };
      mockRedisService.getClient.mockReturnValue(mockRedisClient as any);

      const result = await service.isHealthy();

      expect(result).toBe(false);
    });
  });
});
