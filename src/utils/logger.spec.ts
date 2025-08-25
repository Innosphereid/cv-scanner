import { Logger, LogLevel, LogMetadata } from './logger';

describe('Logger', () => {
  let logger: Logger;
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
    logger = new Logger();
    // Spy on process stdout/stderr since Winston writes to streams
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('Environment Detection', () => {
    it('should detect development environment by default', () => {
      expect(logger['isDevelopment']).toBe(true);
    });

    it('should detect production environment when NODE_ENV is set', () => {
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger();
      expect(prodLogger['isDevelopment']).toBe(false);
    });
  });

  describe('Basic Logging Methods', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(stdoutSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      const writes = stdoutSpy.mock.calls.length + stderrSpy.mock.calls.length;
      expect(writes).toBeGreaterThan(0);
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(stdoutSpy).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      logger.debug('Test debug message');
      expect(stdoutSpy).toHaveBeenCalled();
    });
  });

  describe('Context Logging', () => {
    it('should log with context', () => {
      logger.log('Test message', 'TestService');
      expect(stdoutSpy).toHaveBeenCalled();
    });

    it('should log error with context and trace', () => {
      logger.error('Test error', 'Error stack', 'TestService');
      const writes2 = stdoutSpy.mock.calls.length + stderrSpy.mock.calls.length;
      expect(writes2).toBeGreaterThan(0);
    });
  });

  describe('Metadata Logging', () => {
    it('should log with metadata', () => {
      const metadata: LogMetadata = {
        userId: '123',
        action: 'test'
      };
      
      logger.info('Test message', metadata);
      expect(stdoutSpy).toHaveBeenCalled();
    });

    it('should log with request context', () => {
      const metadata: LogMetadata = {
        userId: '123',
        action: 'test'
      };
      
      logger.logWithRequestContext('Test message', 'req-123', metadata);
      expect(stdoutSpy).toHaveBeenCalled();
    });
  });

  describe('HTTP Request Logging', () => {
    it('should log successful HTTP requests', () => {
      logger.logHttpRequest('GET', '/test', 100, 200, 'req-123');
      expect(stdoutSpy).toHaveBeenCalled();
    });

    it('should log failed HTTP requests as errors', () => {
      logger.logHttpRequest('POST', '/test', 100, 500, 'req-123');
      const writes3 = stdoutSpy.mock.calls.length + stderrSpy.mock.calls.length;
      expect(writes3).toBeGreaterThan(0);
    });
  });

  describe('Log Level Management', () => {
    it('should allow setting log level dynamically', () => {
      logger.setLogLevel(LogLevel.WARN);
      expect(logger.getWinstonLogger().level).toBe(LogLevel.WARN);
    });

    it('should return winston logger instance', () => {
      const winstonLogger = logger.getWinstonLogger();
      expect(winstonLogger).toBeDefined();
      expect(typeof winstonLogger.level).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should handle winston errors gracefully', () => {
      // Simulate winston error
      const winstonLogger = logger.getWinstonLogger();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Trigger error event
      winstonLogger.emit('error', new Error('Winston error'));
      
      expect(errorSpy).toHaveBeenCalledWith('Logger error:', expect.any(Error));
      errorSpy.mockRestore();
    });
  });

  describe('Development vs Production Formatting', () => {
    it('should use development format by default', () => {
      const winstonLogger = logger.getWinstonLogger();
      const transports = winstonLogger.transports;
      
      // Should have console transport
      expect(transports.length).toBeGreaterThan(0);
      
      // Should not have file transports in development; our logger uses two stream transports
      expect(transports.length).toBe(2);
    });

    it('should use production format when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      const prodLogger = new Logger();
      const winstonLogger = prodLogger.getWinstonLogger();
      const transports = winstonLogger.transports;
      
      // Should have console transport
      expect(transports.length).toBeGreaterThan(0);
      
      // Should have file transports in production (more than 1 transport)
      expect(transports.length).toBeGreaterThan(1);
    });
  });
});
