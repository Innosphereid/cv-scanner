import { cloudinaryConfig } from './cloudinary.config';

describe('cloudinaryConfig', () => {
  it('should map env vars to config with defaults', () => {
    const prev = { ...process.env };
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    delete process.env.CLOUDINARY_SECURE;
    delete process.env.CLOUDINARY_API_BASE_URL;
    delete process.env.CLOUDINARY_RETRY_ATTEMPTS;
    delete process.env.CLOUDINARY_RETRY_DELAY_MS;
    delete process.env.CLOUDINARY_FAIL_FAST;

    const cfg = cloudinaryConfig();
    expect(cfg.cloudName).toBe('demo');
    expect(cfg.apiKey).toBe('key');
    expect(cfg.apiSecret).toBe('secret');
    expect(cfg.secure).toBe(true);
    expect(cfg.retryAttempts).toBe(2);
    expect(cfg.retryDelayMs).toBe(500);
    expect(cfg.failFast).toBe(true);

    process.env = prev;
  });
});


