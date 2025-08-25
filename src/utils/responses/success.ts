import {
  type Pagination,
  type RequestMetadata,
  type SuccessResponse,
} from './types';

export class SuccessBuilder<TData = any> {
  private messageText: string = '';
  private payload: TData | null = null;
  private meta: RequestMetadata = { request_id: '', execution_time: 0 };
  private page: Pagination = null;
  private statusCode: number = 200;

  message(message: string): this {
    this.messageText = message;
    return this;
  }

  data(data: TData | null): this {
    this.payload = data;
    return this;
  }

  metadata(metadata: RequestMetadata): this {
    this.meta = metadata;
    return this;
  }

  pagination(pagination: Pagination): this {
    this.page = pagination;
    return this;
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  build(): SuccessResponse<TData> {
    return {
      status: 'success',
      message: this.messageText,
      data: this.payload,
      metadata: this.meta,
      pagination: this.page,
      status_code: this.statusCode,
    };
  }
}
