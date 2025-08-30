import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  path: string;
  enabled: boolean;
}

export class SwaggerConfigService {
  /**
   * Get Swagger configuration based on environment
   */
  static getConfig(): SwaggerConfig {
    // Use process.env directly instead of ConfigService to avoid DI issues
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      title: 'CV Scanner API',
      description: 'Comprehensive API documentation for CV Scanner application',
      version: '1.0.0',
      path: '/api/v1/docs',
      enabled: isDevelopment,
    };
  }

  /**
   * Setup Swagger for the application
   */
  static setupSwagger(app: INestApplication): void {
    const config = SwaggerConfigService.getConfig();

    if (!config.enabled) {
      console.log('Swagger is disabled in production environment');
      return;
    }

    const documentBuilder = new DocumentBuilder()
      .setTitle(config.title)
      .setDescription(config.description)
      .setVersion(config.version)
      .addTag(
        'Authentication',
        'User authentication and authorization endpoints',
      )
      .addTag(
        'Email Verification',
        'Email verification and confirmation endpoints',
      )
      .addTag('Password Management', 'Password reset and management endpoints')
      .addTag('Documentation', 'API documentation endpoints')
      .addServer('http://localhost:3000', 'Development server')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authenticated endpoints',
        },
        'bearerAuth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, documentBuilder);

    // Setup Swagger UI
    SwaggerModule.setup(config.path, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showRequestHeaders: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        requestInterceptor: (req: any) => {
          // Add common headers for try it out
          req.headers['Content-Type'] = 'application/json';
          req.headers['User-Agent'] = 'Swagger-UI';
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return req;
        },
      },
      customSiteTitle: config.title,
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { font-size: 2.5em; }
        .swagger-ui .info .description { font-size: 1.1em; }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
      `,
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
      ],
    });

    console.log(
      `Swagger documentation available at: http://localhost:3000${config.path}`,
    );
  }
}
