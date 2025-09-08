import { Injectable } from '@nestjs/common';
import { Logger } from '../../utils/logger';
import type { UploadInput } from '../../utils/uploadFile/types';
import { CvUploadProcessorService } from './services/cv-upload-processor.service';
import type { DuplicateHandlingOptions } from './types/duplicate-handling.types';

export interface HandleUploadInput {
  userId: string;
  originalFilename: string;
  mimetype: string;
  size: number;
  bufferOrPath: UploadInput;
  duplicateHandling?: DuplicateHandlingOptions;
}

export interface HandleUploadResult {
  id: string;
  url: string;
  isNewUpload: boolean;
  existingUploadId?: string;
}

@Injectable()
export class CvUploadService {
  private readonly context = 'CvUploadService';

  constructor(
    private readonly logger: Logger,
    private readonly uploadProcessor: CvUploadProcessorService,
  ) {}

  /**
   * Handle CV upload with duplicate detection and handling
   * @param input - Upload input parameters
   * @returns Upload result with metadata
   */
  async handleUpload(input: HandleUploadInput): Promise<HandleUploadResult> {
    const {
      userId,
      originalFilename,
      mimetype,
      size,
      bufferOrPath,
      duplicateHandling,
    } = input;

    this.logger.info('Processing CV upload request', {
      userId,
      originalFilename,
      size,
      mimetype,
      duplicateHandling,
    });

    try {
      const result = await this.uploadProcessor.processUpload({
        userId,
        originalFilename,
        mimetype,
        size,
        bufferOrPath,
        duplicateHandling,
      });

      this.logger.info('CV upload completed successfully', {
        userId,
        uploadId: result.id,
        isNewUpload: result.isNewUpload,
        existingUploadId: result.existingUploadId,
      });

      return result;
    } catch (error) {
      this.logger.error(
        'CV upload failed',
        error instanceof Error ? error.stack : undefined,
        this.context,
        {
          userId,
          originalFilename,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
