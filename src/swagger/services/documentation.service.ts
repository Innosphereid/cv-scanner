import { Injectable, Logger } from '@nestjs/common';
import { RouteScannerService, RouteInfo } from './route-scanner.service';
import { ResponseExampleService } from './response-example.service';

export interface EndpointDocumentation {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  requestBody?: any;
  responses: Record<string, any>;
  parameters?: any[];
  security?: any[];
}

@Injectable()
export class DocumentationService {
  private readonly logger = new Logger(DocumentationService.name);

  constructor(
    private readonly routeScanner: RouteScannerService,
    private readonly responseExample: ResponseExampleService,
  ) {}

  /**
   * Generate comprehensive OpenAPI documentation
   */
  generateDocumentation(): any {
    try {
      const routes = this.routeScanner.scanRoutes();
      const paths: Record<string, any> = {};
      const tags: any[] = [];

      // Generate tags from discovered routes
      const uniqueTags = this.extractUniqueTags(routes);
      for (const tag of uniqueTags) {
        tags.push({
          name: tag,
          description: this.getTagDescription(tag),
        });
      }

      // Generate path documentation for each route
      for (const route of routes) {
        const endpointDoc = this.generateEndpointDocumentation(route);
        const pathKey = `/api/v1${endpointDoc.path}`;

        if (!paths[pathKey]) {
          paths[pathKey] = {};
        }

        paths[pathKey][endpointDoc.method.toLowerCase()] = {
          tags: endpointDoc.tags,
          summary: endpointDoc.summary,
          description: endpointDoc.description,
          requestBody: endpointDoc.requestBody,
          responses: endpointDoc.responses,
          parameters: endpointDoc.parameters,
          security: endpointDoc.security,
        };
      }

      const documentation = {
        openapi: '3.0.0',
        info: {
          title: 'CV Scanner API',
          description:
            'Comprehensive API documentation for CV Scanner application',
          version: '1.0.0',
          contact: {
            name: 'API Support',
            email: 'support@cvscanner.com',
          },
        },
        servers: [
          {
            url: 'http://localhost:3000',
            description: 'Development server',
          },
        ],
        tags,
        paths,
        components: {
          schemas: this.generateComponentSchemas(),
          securitySchemes: this.generateSecuritySchemes(),
        },
      };

      this.logger.log('OpenAPI documentation generated successfully');
      return documentation;
    } catch (error) {
      this.logger.error('Error generating documentation', error);
      throw error;
    }
  }

  /**
   * Generate documentation for a specific endpoint
   */
  private generateEndpointDocumentation(
    route: RouteInfo,
  ): EndpointDocumentation {
    const methodName = route.methodName;

    return {
      path: route.fullPath,
      method: route.method,
      summary: this.generateSummary(methodName),
      description: this.generateDescription(methodName),
      tags: route.tags,
      requestBody: this.generateRequestBody(methodName),
      responses: this.generateResponses(methodName),
      parameters: this.generateParameters(methodName),
      security: this.generateSecurity(methodName),
    };
  }

  /**
   * Generate endpoint summary
   */
  private generateSummary(methodName: string): string {
    const actionMap: Record<string, string> = {
      register: 'Register new user',
      login: 'Authenticate user',
      verifyEmail: 'Verify user email',
      forgotPassword: 'Request password reset',
      resetPassword: 'Reset user password',
      resendVerification: 'Resend email verification',
    };

    return actionMap[methodName] || `${methodName} operation`;
  }

  /**
   * Generate endpoint description
   */
  private generateDescription(methodName: string): string {
    const descriptions: Record<string, string> = {
      register:
        'Create a new user account with email and password. The user will receive an email verification link.',
      login:
        'Authenticate user with email and password. Returns JWT access token and user information.',
      verifyEmail:
        'Verify user email address using the verification token sent to their email.',
      forgotPassword:
        "Request a password reset OTP to be sent to the user's email address.",
      resetPassword: 'Reset user password using the OTP received via email.',
      resendVerification:
        'Resend email verification link if the previous one has expired.',
    };

    return (
      descriptions[methodName] ||
      `Detailed description for ${methodName} operation`
    );
  }

  /**
   * Generate request body schema
   */
  private generateRequestBody(methodName: string): any {
    const bodySchemas: Record<string, any> = {
      register: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'User email address',
                  example: 'john.doe@example.com',
                },
                password: {
                  type: 'string',
                  minLength: 8,
                  description: 'User password (minimum 8 characters)',
                  example: 'password123',
                },
              },
            },
            examples: {
              valid: {
                summary: 'Valid registration data',
                value: {
                  email: 'john.doe@example.com',
                  password: 'password123',
                },
              },
            },
          },
        },
      },
      login: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'User email address',
                  example: 'john.doe@example.com',
                },
                password: {
                  type: 'string',
                  description: 'User password',
                  example: 'password123',
                },
              },
            },
            examples: {
              valid: {
                summary: 'Valid login credentials',
                value: {
                  email: 'john.doe@example.com',
                  password: 'password123',
                },
              },
            },
          },
        },
      },
      verifyEmail: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token'],
              properties: {
                token: {
                  type: 'string',
                  description: 'Email verification token',
                  example: 'evt_1234567890abcdef',
                },
              },
            },
          },
        },
      },
      forgotPassword: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'User email address',
                  example: 'john.doe@example.com',
                },
              },
            },
          },
        },
      },
      resetPassword: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'otp', 'newPassword'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'User email address',
                  example: 'john.doe@example.com',
                },
                otp: {
                  type: 'string',
                  description: 'One-time password received via email',
                  example: '123456',
                },
                newPassword: {
                  type: 'string',
                  minLength: 8,
                  description: 'New password (minimum 8 characters)',
                  example: 'newpassword123',
                },
              },
            },
          },
        },
      },
      resendVerification: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'User email address',
                  example: 'john.doe@example.com',
                },
              },
            },
          },
        },
      },
    };

    return bodySchemas[methodName];
  }

  /**
   * Generate response schemas
   */
  private generateResponses(methodName: string): Record<string, any> {
    const successData = this.generateSuccessResponseData(methodName);

    return {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SuccessResponse',
            },
            examples: {
              success: {
                summary: 'Success response',
                value: this.responseExample.generateSuccessExample(
                  'Operation completed successfully',
                  successData,
                  200,
                ),
              },
            },
          },
        },
      },
      '201': {
        description: 'Resource created successfully',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/SuccessResponse',
            },
            examples: {
              created: {
                summary: 'Resource created',
                value: this.responseExample.generateSuccessExample(
                  'Resource created successfully',
                  successData,
                  201,
                ),
              },
            },
          },
        },
      },
      '400': {
        description: 'Bad request - validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            examples: {
              validationError: {
                summary: 'Validation error',
                value: this.responseExample.generateValidationErrorExample(
                  'email',
                  'Email is required',
                ),
              },
            },
          },
        },
      },
      '401': {
        description: 'Unauthorized - authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            examples: {
              unauthorized: {
                summary: 'Authentication failed',
                value: this.responseExample.generateAuthErrorExample(),
              },
            },
          },
        },
      },
      '404': {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            examples: {
              notFound: {
                summary: 'Resource not found',
                value:
                  this.responseExample.generateNotFoundErrorExample('User'),
              },
            },
          },
        },
      },
      '429': {
        description: 'Too many requests - rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            examples: {
              rateLimit: {
                summary: 'Rate limit exceeded',
                value: this.responseExample.generateErrorExample(
                  'Rate limit exceeded',
                  [
                    {
                      code: 'RATE_LIMIT_EXCEEDED',
                      message: 'Too many requests. Please try again later.',
                    },
                  ],
                  429,
                ),
              },
            },
          },
        },
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            examples: {
              serverError: {
                summary: 'Internal server error',
                value: this.responseExample.generateServerErrorExample(),
              },
            },
          },
        },
      },
    };
  }

  /**
   * Generate success response data based on method
   */
  private generateSuccessResponseData(methodName: string): any {
    const dataMap: Record<string, any> = {
      register: this.responseExample.generateExample('user'),
      login: this.responseExample.generateExample('auth'),
      verifyEmail: { message: 'Email verified successfully' },
      forgotPassword: { message: 'Password reset OTP sent to email' },
      resetPassword: { message: 'Password reset successfully' },
      resendVerification: { message: 'Verification email resent successfully' },
    };

    return (
      dataMap[methodName] || { message: 'Operation completed successfully' }
    );
  }

  /**
   * Generate parameters (headers, query params, etc.)
   */
  private generateParameters(methodName: string): any[] {
    const parameters: any[] = [];

    // Add common headers
    parameters.push({
      name: 'User-Agent',
      in: 'header',
      description: 'User agent string',
      required: false,
      schema: {
        type: 'string',
        example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    parameters.push({
      name: 'Content-Type',
      in: 'header',
      description: 'Content type of the request',
      required: true,
      schema: {
        type: 'string',
        example: 'application/json',
      },
    });

    // Add method-specific parameters
    if (methodName === 'login') {
      parameters.push({
        name: 'X-Forwarded-For',
        in: 'header',
        description: 'Client IP address',
        required: false,
        schema: {
          type: 'string',
          example: '192.168.1.1',
        },
      });
    }

    return parameters;
  }

  /**
   * Generate security requirements
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private generateSecurity(_methodName: string): any[] {
    // Most endpoints don't require authentication
    return [];
  }

  /**
   * Generate component schemas
   */
  private generateComponentSchemas(): any {
    return {
      RequestMetadata: {
        type: 'object',
        properties: {
          request_id: {
            type: 'string',
            description: 'Unique request identifier',
            example: 'req_1234567890abcdef',
          },
          execution_time: {
            type: 'number',
            description: 'Request execution time in milliseconds',
            example: 150,
          },
        },
        required: ['request_id', 'execution_time'],
      },
      ErrorItem: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Error code identifier',
            example: 'VALIDATION_ERROR',
          },
          message: {
            type: 'string',
            description: 'Human readable error message',
            example: 'Email is required',
          },
          field: {
            type: 'string',
            description: 'Field name where error occurred',
            example: 'email',
          },
        },
        required: ['code', 'message'],
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'success',
          },
          message: {
            type: 'string',
            example: 'Operation completed successfully',
          },
          data: {
            description: 'Response data payload',
          },
          metadata: {
            $ref: '#/components/schemas/RequestMetadata',
          },
          pagination: {
            description: 'Pagination information if applicable',
            nullable: true,
          },
          status_code: {
            type: 'number',
            example: 200,
          },
        },
        required: ['status', 'message', 'data', 'metadata', 'status_code'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error',
          },
          message: {
            type: 'string',
            example: 'Operation failed',
          },
          errors: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ErrorItem',
            },
          },
          metadata: {
            $ref: '#/components/schemas/RequestMetadata',
          },
          status_code: {
            type: 'number',
            example: 400,
          },
        },
        required: ['status', 'message', 'errors', 'metadata', 'status_code'],
      },
    };
  }

  /**
   * Generate security schemes
   */
  private generateSecuritySchemes(): any {
    return {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authenticated endpoints',
      },
    };
  }

  /**
   * Extract unique tags from routes
   */
  private extractUniqueTags(routes: RouteInfo[]): string[] {
    const tags = new Set<string>();
    for (const route of routes) {
      for (const tag of route.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  /**
   * Get tag description
   */
  private getTagDescription(tag: string): string {
    const descriptions: Record<string, string> = {
      Authentication: 'User authentication and authorization endpoints',
      'Email Verification': 'Email verification and confirmation endpoints',
      'Password Management': 'Password reset and management endpoints',
      Register: 'User registration endpoints',
      Login: 'User login endpoints',
      VerifyEmail: 'Email verification endpoints',
      ForgotPassword: 'Password recovery endpoints',
      ResetPassword: 'Password reset endpoints',
      ResendVerification: 'Email verification resend endpoints',
    };

    return descriptions[tag] || `Endpoints related to ${tag}`;
  }
}
