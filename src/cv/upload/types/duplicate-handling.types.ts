import type { CvUploadEntity } from '../../../entities/cv-upload.entity';

export interface DuplicateFileResult {
  isDuplicate: boolean;
  existingUpload?: CvUploadEntity;
}

export interface FileHashResult {
  hash: string;
  buffer: Buffer;
  mimetype?: string;
  filename?: string;
}

export enum DuplicateHandlingStrategy {
  RETURN_EXISTING = 'return_existing',
  THROW_ERROR = 'throw_error',
  UPDATE_EXISTING = 'update_existing',
}

export interface DuplicateHandlingOptions {
  strategy: DuplicateHandlingStrategy;
  updateMetadata?: boolean;
}
