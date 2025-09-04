import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CvUploadEntity } from '../../entities/cv-upload.entity';
import { CLOUDINARY_TOKEN } from '../../config/cloudinary/cloudinary.module';
import { Logger } from '../../utils/logger';
import {
  uploadSingle,
  type CloudinaryClient,
} from '../../utils/uploadFile/upload';
import type { UploadInput } from '../../utils/uploadFile/types';
import { randomUUID } from 'crypto';

export interface HandleUploadInput {
  userId: string;
  originalFilename: string;
  mimetype: string;
  size: number;
  bufferOrPath: UploadInput;
}

export interface HandleUploadResult {
  id: string;
  url: string;
}

@Injectable()
export class CvUploadService {
  private readonly context = 'CvUploadService';

  constructor(
    @InjectRepository(CvUploadEntity)
    private readonly repo: Repository<CvUploadEntity>,
    @Inject(CLOUDINARY_TOKEN)
    private readonly cloudinary: CloudinaryClient,
    private readonly logger: Logger,
  ) {}

  async handleUpload(input: HandleUploadInput): Promise<HandleUploadResult> {
    const { userId, originalFilename, bufferOrPath } = input;

    // Generate folder: cv/{userId}/{uuid}
    const folderPrefix = `cv/${userId}/${randomUUID()}`;

    const uploadRes = await uploadSingle(
      this.cloudinary as any,
      this.logger,
      bufferOrPath,
      {
        folderPrefix,
        resourceType: 'auto',
        maxAttempts: 3,
        attemptDelayMs: 500,
      },
    );

    // Persist to DB
    const entity = this.repo.create({
      userId,
      originalFilename,
      fileSizeBytes: input.size,
      cloudinaryPublicId: uploadRes.publicId,
      cloudinaryUrl: uploadRes.url,
      cloudinarySecureUrl: uploadRes.url,
      fileHash: uploadRes.checksum,
      parsingStatus: 'pending',
      parsingErrorMessage: null,
    });

    const saved = await this.repo.save(entity);

    this.logger.info('CV upload persisted', {
      userId,
      uploadId: saved.id,
      publicId: uploadRes.publicId,
    });

    return { id: saved.id, url: uploadRes.url };
  }
}
