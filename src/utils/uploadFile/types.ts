import type { Readable } from 'stream';
import type { ConfigOptions } from 'cloudinary';

export type MulterFile = {
  /** Field name specified in the form */
  fieldname: string;
  /** Name of the file on the user's computer */
  originalname: string;
  /** Encoding type of the file */
  encoding: string;
  /** Mime type of the file */
  mimetype: string;
  /** Size of the file in bytes */
  size: number;
  /** The folder to which the file has been saved */
  destination?: string;
  /** The name of the file within the destination */
  filename?: string;
  /** Location of the uploaded file */
  path?: string;
  /** A Buffer of the entire file */
  buffer?: Buffer;
};

export type UploadInput = string | Buffer | Readable | MulterFile;

export interface UploadResult {
  url: string;
  publicId: string;
  size: number; // bytes
  format: string;
  checksum: string; // sha256 hex
}

export interface UploadOptions {
  folderPrefix?: string; // used for naming prefix
  idempotencyKey?: string; // if provided, deterministic public_id suffix
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  // Runtime override for cloudinary config if needed
  cloudinaryConfigOverride?: Partial<ConfigOptions>;
  // Max attempts for single upload (default 3)
  maxAttempts?: number;
  // Delay between attempts in ms (default 500)
  attemptDelayMs?: number;
}

export interface UploadBatchOptions extends UploadOptions {
  // Max number of concurrent uploads
  concurrency?: number; // default 3
}

export interface UploadErrorInfo {
  code: string;
  devMessage: string;
  userMessage: string;
  cause?: unknown;
}

export type UploadBatchItemResult =
  | { ok: true; result: UploadResult }
  | { ok: false; error: UploadErrorInfo };
