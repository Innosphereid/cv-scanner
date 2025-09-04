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

// Multer setup: validate PDF mimetype and size <= 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME = 'application/pdf';

function pdfFileFilter(
  _req: unknown,
  file: MulterFile,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (file.mimetype !== ACCEPTED_MIME) {
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
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @ApiResponse({ status: 415, description: 'Unsupported media type (non-PDF)' })
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

    // Additional server-side validation
    if (file.mimetype !== ACCEPTED_MIME) {
      throw new HttpException('Only PDF files are supported', 415);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new HttpException('File exceeds 5 MB limit', 413);
    }

    const result = await this.service.handleUpload({
      userId,
      originalFilename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bufferOrPath: file.buffer ?? '',
    });

    return new SuccessBuilder<{ id: string; url: string }>()
      .message('Upload successful')
      .data({ id: result.id, url: result.url })
      .metadata(meta)
      .status(HttpStatus.CREATED)
      .build();
  }
}
