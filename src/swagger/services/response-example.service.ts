import { Injectable } from '@nestjs/common';

@Injectable()
export class ResponseExampleService {
  /**
   * Generate realistic example data for different types
   */
  generateExample<T>(type: string, data?: Partial<T>): T {
    const baseExamples: Record<string, any> = {
      user: {
        id: 'usr_1234567890abcdef',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      },
      auth: {
        userId: 'usr_1234567890abcdef',
        email: 'john.doe@example.com',
        refreshToken: 'rt_1234567890abcdef',
        expiresAt: '2024-01-15T11:00:00Z',
      },
      emailVerification: {
        token: 'evt_1234567890abcdef',
        email: 'john.doe@example.com',
        expiresAt: '2024-01-15T11:00:00Z',
      },
      passwordReset: {
        otp: '123456',
        email: 'john.doe@example.com',
        expiresAt: '2024-01-15T11:00:00Z',
      },
    };

    const baseExample = baseExamples[type] || {};
    return { ...baseExample, ...data } as T;
  }

  /**
   * Generate success response example
   */
  generateSuccessExample<T>(
    message: string,
    data: T,
    statusCode: number = 200,
  ) {
    return {
      status: 'success',
      message,
      data,
      metadata: {
        request_id: 'req_1234567890abcdef',
        execution_time: 150,
      },
      pagination: null,
      status_code: statusCode,
    };
  }

  /**
   * Generate error response example
   */
  generateErrorExample(
    message: string,
    errors: Array<{ code: string; message: string; field?: string }>,
    statusCode: number = 400,
  ) {
    return {
      status: 'error',
      message,
      errors,
      metadata: {
        request_id: 'req_1234567890abcdef',
        execution_time: 50,
      },
      status_code: statusCode,
    };
  }

  /**
   * Generate validation error example
   */
  generateValidationErrorExample(field: string, message: string) {
    return this.generateErrorExample(
      'Validation failed',
      [
        {
          code: 'VALIDATION_ERROR',
          message,
          field,
        },
      ],
      400,
    );
  }

  /**
   * Generate authentication error example
   */
  generateAuthErrorExample(message: string = 'Authentication failed') {
    return this.generateErrorExample(
      message,
      [
        {
          code: 'AUTH_ERROR',
          message,
        },
      ],
      401,
    );
  }

  /**
   * Generate not found error example
   */
  generateNotFoundErrorExample(resource: string = 'Resource') {
    return this.generateErrorExample(
      `${resource} not found`,
      [
        {
          code: 'NOT_FOUND',
          message: `${resource} not found`,
        },
      ],
      404,
    );
  }

  /**
   * Generate server error example
   */
  generateServerErrorExample(message: string = 'Internal server Error') {
    return this.generateErrorExample(
      message,
      [
        {
          code: 'INTERNAL_ERROR',
          message,
        },
      ],
      500,
    );
  }
}
