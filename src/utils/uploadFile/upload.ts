import type { ConfigOptions } from 'cloudinary';
import type { Logger } from '../logger';
import {
  type UploadInput,
  type UploadOptions,
  type UploadResult,
  type UploadBatchOptions,
  type UploadBatchItemResult,
} from './types';
import {
  toBuffer,
  computeSha256,
  rejectUnsafeMimeOrExt,
  buildPublicId,
} from './helpers';

export type CloudinaryClient = {
  config: (config: ConfigOptions) => void;
  uploader: {
    upload_stream: (
      options: Record<string, any>,
      callback: (error: unknown, result: any) => void,
    ) => NodeJS.WritableStream;
  };
};

interface CloudinaryUploadResponse {
  secure_url?: string;
  url?: string;
  format?: string;
  resource_type?: string;
  bytes?: number;
  public_id?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

export async function uploadSingle(
  cloudinary: CloudinaryClient,
  logger: Logger,
  input: UploadInput,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const context = 'UploadSingle';
  const folderPrefix = options.folderPrefix;
  const idempotencyKey = options.idempotencyKey;

  const cloudinaryConfigOverride = options.cloudinaryConfigOverride;
  const resourceType = options.resourceType ?? 'auto';
  const maxAttempts = options.maxAttempts ?? 3;
  const attemptDelayMs = options.attemptDelayMs ?? 500;

  const { buffer, mimetype, filename } = await toBuffer(input);
  rejectUnsafeMimeOrExt(filename, mimetype);

  const checksum = computeSha256(buffer);
  const publicId = buildPublicId(folderPrefix, idempotencyKey);

  if (cloudinaryConfigOverride) {
    cloudinary.config(cloudinaryConfigOverride as ConfigOptions);
  }

  logger.log(`Uploading file publicId=${publicId}`, context, {
    size: buffer.length,
  });

  // We strip metadata by specifying exif stripping and use original format (no transformation)
  const uploadOptions = {
    public_id: publicId,
    resource_type: resourceType,
    use_filename: false,
    unique_filename: false,
    overwrite: !!idempotencyKey,
    exif: false,
    colors: false,
    faces: false,
    quality_analysis: false,
    invalidate: true,
  } as Record<string, any>;

  let lastError: unknown;
  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
    try {
      const result = await new Promise<CloudinaryUploadResponse>(
        (resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (err, res) => {
              if (err) {
                const e =
                  err instanceof Error ? err : new Error(getErrorMessage(err));
                return reject(e);
              }
              resolve(res as CloudinaryUploadResponse);
            },
          );
          stream.end(buffer);
        },
      );

      const url: string = result.secure_url ?? result.url ?? '';
      const format: string = result.format ?? result.resource_type ?? 'unknown';
      const size: number = Number(result.bytes ?? buffer.length);

      logger.log(`Upload success publicId=${publicId}`, context, { url });
      return {
        url,
        publicId: result.public_id ?? publicId,
        size,
        format,
        checksum,
      };
    } catch (error) {
      lastError = error;
      logger.warn(
        `Upload failed attempt ${attempt}/${maxAttempts} publicId=${publicId}`,
        context,
      );
      if (attempt < Math.max(1, maxAttempts)) {
        await sleep(attemptDelayMs);
      }
    }
  }

  const err =
    lastError instanceof Error
      ? lastError
      : new Error(getErrorMessage(lastError));
  logger.error('Upload failed after retries', err.stack, context);
  throw err;
}

export async function uploadBatch(
  cloudinary: CloudinaryClient,
  logger: Logger,
  inputs: UploadInput[],
  options: UploadBatchOptions = {},
): Promise<UploadBatchItemResult[]> {
  const context = 'UploadBatch';
  const concurrency = Math.max(1, options.concurrency ?? 3);

  const queue = inputs.map((input, index) => ({ input, index, attempts: 0 }));
  const results: UploadBatchItemResult[] = new Array<UploadBatchItemResult>(
    inputs.length,
  );

  async function worker(): Promise<void> {
    while (true) {
      const item = queue.shift();
      if (!item) return;
      try {
        const res = await uploadSingle(cloudinary, logger, item.input, options);
        results[item.index] = { ok: true, result: res };
      } catch (error) {
        item.attempts += 1;
        if (item.attempts < Math.max(1, options.maxAttempts ?? 3)) {
          // DLQ-style: push back to the end of the queue
          queue.push(item);
          logger.warn(
            `Queue re-enqueue idx=${item.index} attempt=${item.attempts}`,
            context,
          );
        } else {
          results[item.index] = {
            ok: false,
            error: {
              code: 'UPLOAD_FAILED',
              devMessage: 'Upload failed after retries',
              userMessage: 'Gagal mengunggah file. Coba lagi nanti.',
              cause: error,
            },
          };
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  logger.log('Batch upload finished', context);
  return results;
}
