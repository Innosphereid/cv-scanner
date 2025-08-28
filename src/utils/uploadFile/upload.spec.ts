/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../logger.module';
import { Logger } from '../logger';
import { CloudinaryModule, CLOUDINARY_TOKEN } from '../../config/cloudinary/cloudinary.module';
import { uploadSingle, uploadBatch, type CloudinaryClient } from './upload';
import * as fs from 'fs';
import * as path from 'path';

describe('upload utils (integration to Cloudinary)', () => {
  let moduleRef: TestingModule;
  let cloudinary: CloudinaryClient;
  let logger: Logger;
  let enabled = true;

  beforeAll(async () => {
    process.env.CLOUDINARY_FAIL_FAST = 'false';
    process.env.CLOUDINARY_RETRY_ATTEMPTS = '0';
    // Use real env (expects .env present as in project scripts)
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), LoggerModule, CloudinaryModule.register()],
    }).compile();
    cloudinary = moduleRef.get(CLOUDINARY_TOKEN);
    logger = moduleRef.get(Logger);

    // Check if cloudinary account is enabled; if disabled, mark tests to be skipped gracefully
    try {
      const anyClient = cloudinary as unknown as { api?: { ping: () => Promise<unknown> } };
      if (anyClient.api && typeof anyClient.api.ping === 'function') {
        await anyClient.api.ping();
      }
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : String(e);
      if (msg.toLowerCase().includes('cloud_name is disabled') || e?.http_code === 401) {
        enabled = false;
         
        console.warn('[upload.spec] Cloudinary is disabled; skipping integration uploads');
      }
    }
  }, 30000);

  it('should upload each file under @tests directory (public/images/tests)', async () => {
    if (!enabled) {
       
      console.warn('Cloudinary disabled; skipping single-file upload assertions');
      return;
    }
    const testsDir = path.resolve('public/images/tests');
    const entries = await fs.promises.readdir(testsDir);
    const files = entries
      .filter(name => !name.toLowerCase().endsWith('.svg'))
      .map(name => path.join(testsDir, name));

    for (const filePath of files) {
      try {
        const res = await uploadSingle(cloudinary, logger, filePath, {
          folderPrefix: 'test-all',
          idempotencyKey: `it-${path.basename(filePath)}-${Date.now()}`,
        });
        expect(res.url).toMatch(/^https?:\/\//);
        expect(res.publicId).toContain('test-all-');
        expect(res.size).toBeGreaterThan(0);
        expect(res.format).toBeTruthy();
        expect(res.checksum).toMatch(/^[a-f0-9]{64}$/);
      } catch (e: any) {
        const msg = typeof e?.message === 'string' ? e.message : String(e);
        if (msg.toLowerCase().includes('cloud_name is disabled') || e?.http_code === 401) {
           
          console.warn('Cloudinary disabled during upload; skipping');
          return;
        }
        throw e;
      }
    }
  }, 120000);

  it('should upload batch and continue on errors', async () => {
    if (!enabled) {
       
      console.warn('Cloudinary disabled; skipping batch upload assertions');
      return;
    }
    const testsDir = path.resolve('public/images/tests');
    const entries = await fs.promises.readdir(testsDir);
    const inputs = entries
      .filter(name => !name.toLowerCase().endsWith('.svg'))
      .map(name => path.join(testsDir, name));
    let results;
    try {
      results = await uploadBatch(cloudinary, logger, inputs, {
        folderPrefix: 'test-batch',
        concurrency: 2,
        maxAttempts: 2,
        attemptDelayMs: 300,
      });
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : String(e);
      if (msg.toLowerCase().includes('cloud_name is disabled') || e?.http_code === 401) {
         
        console.warn('Cloudinary disabled during batch; skipping');
        return;
      }
      throw e;
    }
    expect(results.length).toBe(inputs.length);
    results.forEach(r => {
      if (r.ok) {
        expect(r.result.url).toBeTruthy();
      } else {
        expect(r.error.code).toBe('UPLOAD_FAILED');
      }
    });
  }, 60000);
});


