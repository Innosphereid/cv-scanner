import {
  type ErrorItem,
  type ErrorResponse,
  type RequestMetadata,
} from './types';

export class ErrorBuilder {
  private messageText: string = '';
  private items: ErrorItem[] = [];
  private meta: RequestMetadata = { request_id: '', execution_time: 0 };
  private statusCode: number = 400;

  message(message: string): this {
    this.messageText = message;
    return this;
  }

  addError(error: ErrorItem): this {
    this.items.push(error);
    return this;
  }

  errors(errors: ErrorItem[]): this {
    this.items = [...errors];
    return this;
  }

  metadata(metadata: RequestMetadata): this {
    this.meta = metadata;
    return this;
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  build(): ErrorResponse {
    return {
      status: 'error',
      message: this.messageText,
      errors: this.items,
      metadata: this.meta,
      status_code: this.statusCode,
    };
  }
}
