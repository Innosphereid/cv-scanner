import { Injectable } from '@nestjs/common';
import { Logger } from '../../../utils/logger';
import { computeSha256, toBuffer } from '../../../utils/uploadFile/helpers';
import type { UploadInput } from '../../../utils/uploadFile/types';
import type { FileHashResult } from '../types/duplicate-handling.types';

@Injectable()
export class FileHashService {
  private readonly context = 'FileHashService';

  constructor(private readonly logger: Logger) {}

  /**
   * Generate file hash from various input types
   * @param input - File input (Buffer, MulterFile, Readable, or file path)
   * @returns File hash result with metadata
   */
  async generateFileHash(input: UploadInput): Promise<FileHashResult> {
    try {
      this.logger.debug('Generating file hash');

      const { buffer, mimetype, filename } = await toBuffer(input);
      const hash = computeSha256(buffer);

      this.logger.debug('File hash generated successfully', this.context, {
        hashLength: hash.length,
        bufferSize: buffer.length,
        mimetype,
        filename,
      });

      return {
        hash,
        buffer,
        mimetype,
        filename,
      };
    } catch (error) {
      this.logger.error(
        'Failed to generate file hash',
        error instanceof Error ? error.stack : undefined,
        this.context,
        { error: error instanceof Error ? error.message : String(error) },
      );
      throw new Error(
        `File hash generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate file hash from buffer only (for existing files)
   * @param buffer - File buffer
   * @returns SHA256 hash string
   */
  generateHashFromBuffer(buffer: Buffer): string {
    return computeSha256(buffer);
  }
}
