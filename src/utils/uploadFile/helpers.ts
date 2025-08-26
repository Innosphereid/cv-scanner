import { createHash } from 'crypto';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { type MulterFile, type UploadInput } from './types';

export function isMulterFile(input: unknown): input is MulterFile {
  return (
    typeof input === 'object' &&
    input !== null &&
    'fieldname' in (input as any) &&
    ('buffer' in (input as any) || 'path' in (input as any))
  );
}

export function isReadableStream(input: unknown): input is Readable {
  return input instanceof Readable;
}

export function computeSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function toBuffer(
  input: UploadInput,
): Promise<{ buffer: Buffer; mimetype?: string; filename?: string }> {
  if (Buffer.isBuffer(input)) {
    return { buffer: input };
  }
  if (typeof input === 'string') {
    const abs = path.resolve(input);
    const buf = await fs.promises.readFile(abs);
    return { buffer: buf };
  }
  if (isReadableStream(input)) {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      input.on('data', chunk => chunks.push(Buffer.from(chunk)));
      input.on('error', reject);
      input.on('end', () => resolve());
    });
    return { buffer: Buffer.concat(chunks) };
  }
  if (isMulterFile(input)) {
    if (input.buffer) {
      return {
        buffer: input.buffer,
        mimetype: input.mimetype,
        filename: input.originalname,
      };
    }
    if (input.path) {
      const buf = await fs.promises.readFile(input.path);
      return {
        buffer: buf,
        mimetype: input.mimetype,
        filename: input.originalname,
      };
    }
  }
  throw new Error('Unsupported upload input type');
}

export function rejectUnsafeMimeOrExt(
  filename?: string,
  mimetype?: string,
): void {
  const lowerMime = (mimetype ?? '').toLowerCase();
  const lowerName = (filename ?? '').toLowerCase();
  if (lowerMime.includes('image/svg') || lowerName.endsWith('.svg')) {
    throw new Error('SVG format is not allowed');
  }
  if (lowerMime.includes('xml') || lowerMime.includes('svg')) {
    throw new Error('XML/SVG content is not allowed');
  }
}

export function buildPublicId(
  prefix?: string,
  idempotencyKey?: string,
): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const suffix = idempotencyKey || `${ts}-${rand}`;
  return prefix ? `${prefix}-${suffix}` : suffix;
}
