import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { RequestContextInterceptor } from './utils/responses/request-context.interceptor';
import { SwaggerConfigService } from './swagger/config/swagger.config';
import './instrument';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new RequestContextInterceptor());

  // Setup Swagger documentation
  SwaggerConfigService.setupSwagger(app);

  const port = parseInt(process.env.PORT || '3000', 10);
  try {
    await app.listen(port, '0.0.0.0');
    Logger.log(`App listening on http://0.0.0.0:${port}`, 'Bootstrap');
  } catch (err) {
    Logger.error('Failed to start HTTP server', (err as Error)?.stack);
    throw err;
  }
}
void bootstrap();
