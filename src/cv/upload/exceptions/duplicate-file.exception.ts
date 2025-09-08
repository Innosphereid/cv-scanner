import { HttpException, HttpStatus } from '@nestjs/common';

export class DuplicateFileException extends HttpException {
  constructor(
    message: string = 'File already uploaded',
    existingUploadId?: string,
  ) {
    super(
      {
        message,
        code: 'DUPLICATE_FILE',
        existingUploadId,
      },
      HttpStatus.CONFLICT,
    );
  }
}
