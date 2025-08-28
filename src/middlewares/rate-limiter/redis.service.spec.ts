import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

// Mock ioredis module with proper default export
jest.mock('ioredis', () => {
  const mockRedis = {
    on: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    pipeline: jest.fn(),
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    multi: jest.fn(),
  };

  // Mock the default export (Redis constructor)
  const MockRedis = jest.fn().mockImplementation(() => mockRedis);
  
  // Return both default and named exports
  return {
    __esModule: true,
    default: MockRedis,
    Redis: MockRedis,
  };
});

// Import after mocking
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedis: any;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.get.mockReturnValue({
      host: 'localhost',
      port: 6379,
      password: undefined,
      db: 0,
      keyPrefix: 'cv-scanner:',
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000,
      enableOfflineQueue: false,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    
    // Get the mocked Redis instance from the service
    mockRedis = (service as any).redis;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(mockRedis).toBeDefined();
  });

  describe('processRateLimitRequest', () => {
    it('should process rate limit request successfully', async () => {
      const key = 'test-key';
      const ttl = 60;

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, null],           // get result
          [null, 45],             // ttl result
          [null, 1],              // incr result
          [null, 1],              // expire result
        ]),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.processRateLimitRequest(key, ttl);

      expect(result).toEqual({
        currentCount: 1,
        remainingTime: 45,
        isNewKey: true,
      });
    });

    it('should handle pipeline failure', async () => {
      const key = 'test-key';
      const ttl = 60;

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await expect(service.processRateLimitRequest(key, ttl)).rejects.toThrow(
        'Redis pipeline execution failed - no results returned'
      );
    });
  });

  describe('getRateLimitStatus', () => {
    it('should get rate limit status successfully', async () => {
      const key = 'test-key';

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, '5'],            // get result
          [null, 30],             // ttl result
        ]),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getRateLimitStatus(key);

      expect(result).toEqual({
        currentCount: 5,
        remainingTime: 30,
      });
    });
  });

  describe('batchProcessRateLimitRequests', () => {
    it('should process multiple requests successfully', async () => {
      const requests = [
        { key: 'key1', ttl: 60 },
        { key: 'key2', ttl: 300 },
      ];

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        ttl: jest.fn().mockReturnThis(),
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          // First request
          [null, null], [null, 60], [null, 1], [null, 1],
          // Second request
          [null, '3'], [null, 240], [null, 4], [null, 1],
        ]),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const results = await service.batchProcessRateLimitRequests(requests);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        currentCount: 1,
        remainingTime: 60,
        isNewKey: true,
      });
    });

    it('should handle empty requests', async () => {
      const results = await service.batchProcessRateLimitRequests([]);
      expect(results).toEqual([]);
    });
  });

  describe('Legacy methods', () => {
    it('should increment key with TTL', async () => {
      const key = 'test-key';
      const ttl = 60;

      const mockMulti = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5],              // incr result
          [null, 1],              // expire result
        ]),
      };

      mockRedis.multi.mockReturnValue(mockMulti);

      const result = await service.increment(key, ttl);

      expect(result).toBe(5);
    });
  });

  describe('Connection management', () => {
    it('should connect successfully', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      await service.onModuleInit();

      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should close connection gracefully', async () => {
      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should return Redis client', () => {
      const client = service.getClient();
      expect(client).toBe(mockRedis);
    });
  });
});
