import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  Req,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AccessTokenGuard } from '../../auth/login/guards/access-token.guard';
import {
  RateLimit,
  RateLimitInterceptor,
} from '../../middlewares/rate-limiter';
import { CvUploadService } from './cv-upload.service';
import { Logger } from '../../utils/logger';
import { SuccessBuilder } from '../../utils/responses/success';
import type { Request } from 'express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiCookieAuth,
  ApiResponse,
} from '@nestjs/swagger';
import type { MulterFile } from '../../utils/uploadFile/types';
import { DuplicateHandlingStrategy } from './types/duplicate-handling.types';

// Multer setup: validate PDF mimetype and size <= 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME = 'application/pdf';

function pdfFileFilter(
  _req: unknown,
  file: MulterFile,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (!file || !file.mimetype || file.mimetype !== ACCEPTED_MIME) {
    return cb(new Error('UNSUPPORTED_MEDIA_TYPE'), false);
  }
  cb(null, true);
}

// Use in-memory storage; keep file in buffer for streaming to Cloudinary
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const storage = memoryStorage();

@ApiTags('CV Upload')
@Controller()
@UseInterceptors(RateLimitInterceptor)
export class CvUploadController {
  private readonly logger = new Logger();

  constructor(private readonly service: CvUploadService) {}

  @Post('uploads')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(
    FileInterceptor('cv_file', {
      storage,
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: pdfFileFilter,
    }),
  )
  @RateLimit({ type: 'upload', customLimit: 5, customTtl: 60 })
  @ApiCookieAuth('access_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload CV in PDF format (≤ 5 MB) using field name "cv_file"',
    schema: {
      type: 'object',
      properties: {
        cv_file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['cv_file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Created',
    content: {
      'application/json': {
        examples: {
          created: {
            summary: 'Upload successful',
            value: {
              status: 'success',
              message: 'Upload successful',
              data: {
                id: 'upl_1234567890',
                url: 'https://res.cloudinary.com/demo/image/upload/v123456789/cv/upl_1234567890.pdf',
                isNewUpload: true,
              },
              metadata: {
                request_id: 'req-abc123',
                execution_time: 45,
              },
              pagination: null,
              status_code: 201,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - No file uploaded',
    content: {
      'application/json': {
        examples: {
          noFile: {
            summary: 'No file uploaded',
            value: {
              status: 'error',
              message: 'No file uploaded. Please select a PDF file to upload.',
              errors: [
                {
                  code: 'NO_FILE_UPLOADED',
                  message: 'No file provided in field "cv_file"',
                },
              ],
              metadata: { request_id: 'req-abc123', execution_time: 2 },
              status_code: 400,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    content: {
      'application/json': {
        examples: {
          unauthorized: {
            summary: 'Unauthorized',
            value: {
              status: 'error',
              message: 'Authentication required',
              errors: [
                {
                  code: 'AUTH_REQUIRED',
                  message: 'Valid session cookie is required',
                },
              ],
              metadata: { request_id: 'req-abc123', execution_time: 1 },
              status_code: 401,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'File already uploaded (if configured to throw error)',
    content: {
      'application/json': {
        examples: {
          conflict: {
            summary: 'Duplicate upload',
            value: {
              status: 'error',
              message: 'File already uploaded',
              errors: [
                {
                  code: 'DUPLICATE_UPLOAD',
                  message: 'The same file has already been uploaded',
                },
              ],
              metadata: { request_id: 'req-abc123', execution_time: 7 },
              status_code: 409,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 413,
    description: 'File too large',
    content: {
      'application/json': {
        examples: {
          tooLarge: {
            summary: 'Payload too large',
            value: {
              status: 'error',
              message: 'File exceeds 5 MB limit',
              errors: [
                {
                  code: 'PAYLOAD_TOO_LARGE',
                  message: 'Maximum file size is 5 MB',
                },
              ],
              metadata: { request_id: 'req-abc123', execution_time: 1 },
              status_code: 413,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 415,
    description: 'Unsupported media type (non-PDF)',
    content: {
      'application/json': {
        examples: {
          unsupported: {
            summary: 'Unsupported media type',
            value: {
              status: 'error',
              message: 'Only PDF files are supported',
              errors: [
                {
                  code: 'UNSUPPORTED_MEDIA_TYPE',
                  message: 'Only application/pdf is allowed',
                },
              ],
              metadata: { request_id: 'req-abc123', execution_time: 1 },
              status_code: 415,
            },
          },
        },
      },
    },
  })
  async uploadCv(
    @UploadedFile() file: MulterFile,
    @Req()
    req: Request & {
      user?: { userId: string };
      requestMetadata?: { request_id: string; execution_time: number };
    },
  ) {
    const meta = req.requestMetadata || { request_id: '', execution_time: 0 };
    const userId = req.user?.userId ?? '';

    // Check if file was uploaded
    if (!file) {
      throw new HttpException(
        'No file uploaded. Please select a PDF file to upload.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Additional server-side validation
    if (!file.mimetype || file.mimetype !== ACCEPTED_MIME) {
      throw new HttpException(
        'Only PDF files are supported',
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }
    if (!file.size || file.size > MAX_FILE_SIZE) {
      throw new HttpException(
        'File exceeds 5 MB limit',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    try {
      const result = await this.service.handleUpload({
        userId,
        originalFilename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        bufferOrPath: file.buffer ?? '',
        duplicateHandling: {
          strategy: DuplicateHandlingStrategy.RETURN_EXISTING,
          updateMetadata: false,
        },
      });

      const message = result.isNewUpload
        ? 'Upload successful'
        : 'File already exists, returning existing upload';

      return new SuccessBuilder<{
        id: string;
        url: string;
        isNewUpload: boolean;
        existingUploadId?: string;
      }>()
        .message(message)
        .data({
          id: result.id,
          url: result.url,
          isNewUpload: result.isNewUpload,
          existingUploadId: result.existingUploadId,
        })
        .metadata(meta)
        .status(HttpStatus.CREATED)
        .build();
    } catch (error) {
      this.logger.error(
        'CV upload failed in controller',
        error instanceof Error ? error.stack : undefined,
        'CvUploadController',
        {
          userId,
          originalFilename: file?.originalname || 'unknown',
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }
}
