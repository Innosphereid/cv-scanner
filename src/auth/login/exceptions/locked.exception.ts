import { HttpException, HttpStatus } from '@nestjs/common';

export class LockedException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.LOCKED);
  }
}
