import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '../../../utils/logger';
import { CvUploadEntity } from '../../../entities/cv-upload.entity';
import type {
  DuplicateFileResult,
  DuplicateHandlingOptions,
} from '../types/duplicate-handling.types';
import { DuplicateHandlingStrategy } from '../types/duplicate-handling.types';

@Injectable()
export class DuplicateDetectionService {
  private readonly context = 'DuplicateDetectionService';

  constructor(
    @InjectRepository(CvUploadEntity)
    private readonly cvUploadRepository: Repository<CvUploadEntity>,
    private readonly logger: Logger,
  ) {}

  /**
   * Check if a file with the same hash already exists for the user
   * @param userId - User ID
   * @param fileHash - File hash to check
   * @returns Duplicate file result
   */
  async checkForDuplicate(
    userId: string,
    fileHash: string,
  ): Promise<DuplicateFileResult> {
    try {
      this.logger.debug('Checking for duplicate file', this.context, {
        userId,
        fileHashLength: fileHash.length,
      });

      const existingUpload = await this.cvUploadRepository.findOne({
        where: {
          userId,
          fileHash,
          deletedAt: null as any,
        },
        select: [
          'id',
          'userId',
          'originalFilename',
          'fileSizeBytes',
          'cloudinaryPublicId',
          'cloudinaryUrl',
          'cloudinarySecureUrl',
          'fileHash',
          'parsingStatus',
          'parsingErrorMessage',
          'createdAt',
          'updatedAt',
        ],
      });

      const isDuplicate = !!existingUpload;

      this.logger.debug('Duplicate check completed', this.context, {
        userId,
        isDuplicate,
        existingUploadId: existingUpload?.id,
      });

      return {
        isDuplicate,
        existingUpload: existingUpload || undefined,
      };
    } catch (error) {
      this.logger.error(
        'Failed to check for duplicate file',
        error instanceof Error ? error.stack : undefined,
        this.context,
        {
          userId,
          fileHash,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new Error(
        `Duplicate detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle duplicate file based on strategy
   * @param duplicateResult - Result from duplicate check
   * @param options - Handling options
   * @returns Processed result
   */
  handleDuplicate(
    duplicateResult: DuplicateFileResult,
    options: DuplicateHandlingOptions,
  ): { shouldProceed: boolean; existingUpload?: CvUploadEntity } {
    if (!duplicateResult.isDuplicate || !duplicateResult.existingUpload) {
      return { shouldProceed: true };
    }

    this.logger.info('Duplicate file detected', {
      existingUploadId: duplicateResult.existingUpload.id,
      strategy: options.strategy,
    });

    switch (options.strategy) {
      case DuplicateHandlingStrategy.RETURN_EXISTING:
        this.logger.info('Returning existing upload', {
          existingUploadId: duplicateResult.existingUpload.id,
        });
        return {
          shouldProceed: false,
          existingUpload: duplicateResult.existingUpload,
        };

      case DuplicateHandlingStrategy.THROW_ERROR:
        this.logger.warn('Throwing duplicate file error', this.context, {
          existingUploadId: duplicateResult.existingUpload.id,
        });
        throw new Error('File already uploaded');

      case DuplicateHandlingStrategy.UPDATE_EXISTING:
        this.logger.info('Updating existing upload', {
          existingUploadId: duplicateResult.existingUpload.id,
          updateMetadata: options.updateMetadata,
        });
        return {
          shouldProceed: true,
          existingUpload: duplicateResult.existingUpload,
        };

      default:
        this.logger.warn('Unknown duplicate handling strategy', this.context, {
          strategy: options.strategy,
        });
        return { shouldProceed: true };
    }
  }
}
