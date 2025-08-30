import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DocumentationService } from './services/documentation.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Documentation')
@Controller('api/v1/docs')
export class SwaggerController {
  constructor(private readonly documentationService: DocumentationService) {}

  @Get()
  @ApiOperation({
    summary: 'Get API Documentation',
    description:
      'Retrieve comprehensive OpenAPI documentation for all available endpoints',
  })
  @ApiResponse({
    status: 200,
    description: 'OpenAPI documentation in JSON format',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error while generating documentation',
  })
  getDocumentation(@Res() res: Response) {
    try {
      const documentation = this.documentationService.generateDocumentation();

      res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'API documentation generated successfully',
        data: documentation,
        metadata: {
          request_id: 'docs_' + Date.now(),
          execution_time: 0,
        },
        status_code: HttpStatus.OK,
      });
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Failed to generate API documentation',
        errors: [
          {
            code: 'DOCUMENTATION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        metadata: {
          request_id: 'docs_' + Date.now(),
          execution_time: 0,
        },
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  @Get('openapi.json')
  @ApiOperation({
    summary: 'Get OpenAPI Specification',
    description:
      'Retrieve OpenAPI specification in standard format for external tools',
  })
  @ApiResponse({
    status: 200,
    description: 'OpenAPI specification in JSON format',
  })
  getOpenApiSpec(@Res() res: Response) {
    try {
      const documentation = this.documentationService.generateDocumentation();

      // Return raw OpenAPI spec without wrapper
      res.status(HttpStatus.OK).json(documentation);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Failed to generate OpenAPI specification',
        errors: [
          {
            code: 'OPENAPI_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }
}
