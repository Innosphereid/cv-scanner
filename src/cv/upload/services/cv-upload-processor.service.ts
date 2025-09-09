import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '../../../utils/logger';
import { CvUploadEntity } from '../../../entities/cv-upload.entity';
import { CLOUDINARY_TOKEN } from '../../../config/cloudinary/cloudinary.module';
import {
  uploadSingle,
  type CloudinaryClient,
} from '../../../utils/uploadFile/upload';
import type { UploadInput } from '../../../utils/uploadFile/types';
import { FileHashService } from './file-hash.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import type { DuplicateHandlingOptions } from '../types/duplicate-handling.types';
import { DuplicateHandlingStrategy } from '../types/duplicate-handling.types';
import { randomUUID } from 'crypto';

export interface ProcessUploadInput {
  userId: string;
  originalFilename: string;
  mimetype: string;
  size: number;
  bufferOrPath: UploadInput;
  duplicateHandling?: DuplicateHandlingOptions;
}

export interface ProcessUploadResult {
  id: string;
  url: string;
  isNewUpload: boolean;
  existingUploadId?: string;
}

@Injectable()
export class CvUploadProcessorService {
  private readonly context = 'CvUploadProcessorService';

  constructor(
    @InjectRepository(CvUploadEntity)
    private readonly cvUploadRepository: Repository<CvUploadEntity>,
    @Inject(CLOUDINARY_TOKEN)
    private readonly cloudinary: CloudinaryClient,
    private readonly logger: Logger,
    private readonly fileHashService: FileHashService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  /**
   * Process CV upload with duplicate handling
   * @param input - Upload input parameters
   * @returns Upload result
   */
  async processUpload(input: ProcessUploadInput): Promise<ProcessUploadResult> {
    const {
      userId,
      originalFilename,
      mimetype,
      size,
      bufferOrPath,
      duplicateHandling,
    } = input;

    // Default duplicate handling strategy
    const handlingOptions: DuplicateHandlingOptions = {
      strategy: DuplicateHandlingStrategy.RETURN_EXISTING,
      updateMetadata: false,
      ...duplicateHandling,
    };

    try {
      this.logger.info('Starting CV upload process', {
        userId,
        originalFilename,
        size,
        mimetype,
        strategy: handlingOptions.strategy,
      });

      // Step 1: Generate file hash
      const fileHashResult =
        await this.fileHashService.generateFileHash(bufferOrPath);

      // Step 2: Check for duplicates
      const duplicateResult =
        await this.duplicateDetectionService.checkForDuplicate(
          userId,
          fileHashResult.hash,
        );

      // Step 3: Handle duplicates based on strategy
      const duplicateHandlingResult =
        this.duplicateDetectionService.handleDuplicate(
          duplicateResult,
          handlingOptions,
        );

      if (
        !duplicateHandlingResult.shouldProceed &&
        duplicateHandlingResult.existingUpload
      ) {
        this.logger.info('Returning existing upload', {
          userId,
          existingUploadId: duplicateHandlingResult.existingUpload.id,
        });

        return {
          id: duplicateHandlingResult.existingUpload.id,
          url: duplicateHandlingResult.existingUpload.cloudinaryUrl,
          isNewUpload: false,
          existingUploadId: duplicateHandlingResult.existingUpload.id,
        };
      }

      // Step 4: Upload to Cloudinary
      const uploadResult = await this.uploadToCloudinary(
        bufferOrPath,
        userId,
        fileHashResult.hash,
      );

      // Step 5: Save to database
      const savedEntity = await this.saveToDatabase({
        userId,
        originalFilename,
        fileSizeBytes: size,
        cloudinaryPublicId: uploadResult.publicId,
        cloudinaryUrl: uploadResult.url,
        cloudinarySecureUrl: uploadResult.url,
        fileHash: fileHashResult.hash,
        parsingStatus: 'pending',
        parsingErrorMessage: null,
        existingUpload: duplicateHandlingResult.existingUpload,
        updateMetadata: handlingOptions.updateMetadata ?? false,
      });

      this.logger.info('CV upload process completed successfully', {
        userId,
        uploadId: savedEntity.id,
        isNewUpload: !duplicateHandlingResult.existingUpload,
        existingUploadId: duplicateHandlingResult.existingUpload?.id,
      });

      return {
        id: savedEntity.id,
        url: savedEntity.cloudinaryUrl,
        isNewUpload: !duplicateHandlingResult.existingUpload,
        existingUploadId: duplicateHandlingResult.existingUpload?.id,
      };
    } catch (error) {
      this.logger.error(
        'CV upload process failed',
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

  /**
   * Upload file to Cloudinary
   * @param input - File input
   * @param userId - User ID
   * @param fileHash - File hash for idempotency
   * @returns Upload result
   */
  private async uploadToCloudinary(
    input: UploadInput,
    userId: string,
    fileHash: string,
  ): Promise<{ url: string; publicId: string }> {
    const folderPrefix = `cv/${userId}/${randomUUID()}`;

    this.logger.debug('Uploading to Cloudinary', this.context, {
      userId,
      folderPrefix,
      fileHashLength: fileHash.length,
    });

    const uploadResult = await uploadSingle(
      this.cloudinary,
      this.logger,
      input,
      {
        folderPrefix,
        resourceType: 'raw', // Force 'raw' for PDF files to ensure proper handling
        maxAttempts: 3,
        attemptDelayMs: 500,
        type: 'upload', // Ensure public upload type
        accessMode: 'public', // Ensure public access mode
      },
    );

    this.logger.debug('Cloudinary upload completed', this.context, {
      userId,
      publicId: uploadResult.publicId,
      url: uploadResult.url,
    });

    return {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
    };
  }

  /**
   * Save upload record to database
   * @param data - Upload data
   * @returns Saved entity
   */
  private async saveToDatabase(data: {
    userId: string;
    originalFilename: string;
    fileSizeBytes: number;
    cloudinaryPublicId: string;
    cloudinaryUrl: string;
    cloudinarySecureUrl: string;
    fileHash: string;
    parsingStatus: 'pending';
    parsingErrorMessage: null;
    existingUpload?: CvUploadEntity;
    updateMetadata: boolean;
  }): Promise<CvUploadEntity> {
    if (data.existingUpload && data.updateMetadata) {
      // Update existing record
      this.logger.debug('Updating existing upload record', this.context, {
        existingUploadId: data.existingUpload.id,
      });

      data.existingUpload.cloudinaryPublicId = data.cloudinaryPublicId;
      data.existingUpload.cloudinaryUrl = data.cloudinaryUrl;
      data.existingUpload.cloudinarySecureUrl = data.cloudinarySecureUrl;
      data.existingUpload.originalFilename = data.originalFilename;
      data.existingUpload.fileSizeBytes = data.fileSizeBytes;
      data.existingUpload.updatedAt = new Date();

      return await this.cvUploadRepository.save(data.existingUpload);
    } else {
      // Create new record
      this.logger.debug('Creating new upload record', this.context, {
        userId: data.userId,
        fileHashLength: data.fileHash.length,
      });

      const entity = this.cvUploadRepository.create({
        userId: data.userId,
        originalFilename: data.originalFilename,
        fileSizeBytes: data.fileSizeBytes,
        cloudinaryPublicId: data.cloudinaryPublicId,
        cloudinaryUrl: data.cloudinaryUrl,
        cloudinarySecureUrl: data.cloudinarySecureUrl,
        fileHash: data.fileHash,
        parsingStatus: data.parsingStatus,
        parsingErrorMessage: data.parsingErrorMessage,
      });

      return await this.cvUploadRepository.save(entity);
    }
  }
}
