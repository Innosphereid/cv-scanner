import { ApiProperty } from '@nestjs/swagger';

export class RequestMetadataDto {
  @ApiProperty({
    description: 'Unique request identifier',
    example: 'req_1234567890abcdef',
  })
  request_id: string;

  @ApiProperty({
    description: 'Request execution time in milliseconds',
    example: 150,
  })
  execution_time: number;
}

export class ErrorItemDto {
  @ApiProperty({
    description: 'Error code identifier',
    example: 'VALIDATION_ERROR',
  })
  code: string;

  @ApiProperty({
    description: 'Human readable error message',
    example: 'Email is required',
  })
  message: string;

  @ApiProperty({
    description: 'Field name where error occurred (optional)',
    example: 'email',
    required: false,
  })
  field?: string;
}

export class PaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  per_page: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  total_pages: number;
}

export class SuccessResponseDto<T> {
  @ApiProperty({
    description: 'Response status',
    example: 'success',
  })
  status: 'success';

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response data payload',
  })
  data: T | null;

  @ApiProperty({
    description: 'Request metadata information',
    type: RequestMetadataDto,
  })
  metadata: RequestMetadataDto;

  @ApiProperty({
    description: 'Pagination information if applicable',
    type: PaginationDto,
    required: false,
  })
  pagination: PaginationDto | null;

  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  status_code: number;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Response status',
    example: 'error',
  })
  status: 'error';

  @ApiProperty({
    description: 'Error message',
    example: 'Operation failed',
  })
  message: string;

  @ApiProperty({
    description: 'List of error details',
    type: [ErrorItemDto],
  })
  errors: ErrorItemDto[];

  @ApiProperty({
    description: 'Request metadata information',
    type: RequestMetadataDto,
  })
  metadata: RequestMetadataDto;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  status_code: number;
}
