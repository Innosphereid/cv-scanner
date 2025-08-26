/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Writable } from 'stream';
import { createHash } from 'crypto';
import { uploadSingle, uploadBatch, type CloudinaryClient } from './upload';
import type { Logger } from '../logger';

interface TestLogger {
  log: (message: string, context?: string, metadata?: unknown) => void;
  warn: (message: string, context?: string, metadata?: unknown) => void;
  error: (
    message: string,
    trace?: string,
    context?: string,
    metadata?: unknown,
  ) => void;
}

function createLoggerMock(): TestLogger {
  return {
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };
}

function createCloudinarySuccessMock(): CloudinaryClient {
  const client = {
    config: () => undefined,
    uploader: {
      upload_stream: (
        options: Record<string, any>,
        cb: (err: unknown, res: unknown) => void,
      ) => {
        const chunks: Buffer[] = [];
        return new Writable({
          write(chunk, _enc, done) {
            chunks.push(Buffer.from(chunk));
            done();
          },
          final(done) {
            const buffer = Buffer.concat(chunks);
            const res = {
              secure_url: `https://res.cloudinary.com/demo/${options.public_id}`,
              format: options.resource_type ?? 'raw',
              bytes: buffer.length,
              public_id: options.public_id,
            };
            setImmediate(() => cb(null, res));
            done();
          },
        });
      },
    },
  };
  return client as unknown as CloudinaryClient;
}

describe('upload utils - happy path (mocked)', () => {
  const logger = createLoggerMock();
  const typedLogger = logger as unknown as Logger;
  const cloudinary = createCloudinarySuccessMock();

  it('uploadSingle returns expected shape and values', async () => {
    const input = Buffer.from('hello world');
    const result = await uploadSingle(cloudinary, typedLogger, input, {
      folderPrefix: 'unit',
      idempotencyKey: 'fixed-key',
      resourceType: 'raw',
    });

    expect(result.url).toMatch(/^https:\/\/res\.cloudinary\.com\/demo\/unit-fixed-key/);
    expect(result.publicId).toBe('unit-fixed-key');
    expect(result.size).toBe(input.length);
    expect(result.format).toBe('raw');
    expect(result.checksum).toBe(createHash('sha256').update(input).digest('hex'));
  });

  it('uploadBatch returns ok results for all inputs', async () => {
    const inputs = [Buffer.from('a'), Buffer.from('bb'), Buffer.from('ccc')];
    const results = await uploadBatch(cloudinary, typedLogger, inputs, {
      folderPrefix: 'batch',
      idempotencyKey: 'same',
      resourceType: 'raw',
      concurrency: 2,
      maxAttempts: 1,
    });

    expect(results).toHaveLength(inputs.length);
    results.forEach((r, idx) => {
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.result.publicId).toMatch(/^batch-/);
        expect(r.result.size).toBe(inputs[idx].length);
      }
    });
  });
});


