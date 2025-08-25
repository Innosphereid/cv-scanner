export type StatusLiteral = 'success' | 'error';

export interface RequestMetadata {
  request_id: string;
  execution_time: number; // milliseconds
}

export interface OffsetPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface CursorPagination {
  next_cursor?: string | null;
  prev_cursor?: string | null;
  per_page: number;
  total?: number;
}

export type Pagination = OffsetPagination | CursorPagination | null;

export interface SuccessResponse<T> {
  status: 'success';
  message: string;
  data: T | null;
  metadata: RequestMetadata;
  pagination: Pagination;
  status_code: number;
}

export interface ErrorItem {
  code: string;
  message: string;
  field?: string;
}

export interface ErrorResponse {
  status: 'error';
  message: string;
  errors: ErrorItem[];
  metadata: RequestMetadata;
  status_code: number;
}
