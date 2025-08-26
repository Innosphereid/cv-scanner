/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Writable } from 'stream';
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

function createCloudinaryFailOnceMock(): CloudinaryClient {
  let call = 0;
  const client = {
    config: () => undefined,
    uploader: {
      upload_stream: (
        _options: Record<string, any>,
        cb: (err: unknown, res: unknown) => void,
      ) => {
        call += 1;
        const chunks: Buffer[] = [];
        return new Writable({
          write(chunk, _enc, done) {
            chunks.push(Buffer.from(chunk));
            done();
          },
          final(done) {
            if (call % 2 === 1) {
              setImmediate(() => cb(new Error('Intermittent failure'), null));
            } else {
              setImmediate(() =>
                cb(null, {
                  url: 'http://ok',
                  bytes: chunks.reduce((s, c) => s + c.length, 0),
                  public_id: 'pid',
                }),
              );
            }
            done();
          },
        });
      },
    },
  };
  return client as unknown as CloudinaryClient;
}

function createCloudinaryAlwaysFailMock(): CloudinaryClient {
  const client = {
    config: () => undefined,
    uploader: {
      upload_stream: (_options: Record<string, any>, cb: (err: unknown, res: unknown) => void) => {
        return new Writable({
          write(_chunk, _enc, done) {
            done();
          },
          final(done) {
            // Always invoke the provided callback with an error to emulate failure
            setImmediate(() => cb(new Error('Always fail'), null));
            done();
          },
        });
      },
    },
  };
  return client as unknown as CloudinaryClient;
}

describe('upload utils - unhappy path (mocked)', () => {
  const logger = createLoggerMock();
  const typedLogger = logger as unknown as Logger;

  it('uploadSingle retries on transient error and eventually succeeds', async () => {
    const cloudinary = createCloudinaryFailOnceMock();
    const res = await uploadSingle(cloudinary, typedLogger, Buffer.from('x'), {
      folderPrefix: 'unhappy',
      idempotencyKey: 'k',
      maxAttempts: 2,
      attemptDelayMs: 1,
    });
    expect(res.url).toBeTruthy();
  });

  it('uploadSingle throws after exhausting retries', async () => {
    const cloudinary = createCloudinaryAlwaysFailMock();
    await expect(
      uploadSingle(cloudinary, typedLogger, Buffer.from('y'), {
        maxAttempts: 1,
        attemptDelayMs: 1,
      }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('uploadBatch continues on errors and returns per-item results', async () => {
    const cloudinary = createCloudinaryFailOnceMock();
    const inputs = [Buffer.from('a'), Buffer.from('bb'), Buffer.from('ccc')];
    const results = await uploadBatch(cloudinary, typedLogger, inputs, {
      concurrency: 2,
      maxAttempts: 2,
      attemptDelayMs: 1,
    });
    expect(results).toHaveLength(inputs.length);
    const oks = results.filter(r => r.ok) as Array<{ ok: true; result: any }>;
    expect(oks.length).toBeGreaterThan(0);
  });
});


