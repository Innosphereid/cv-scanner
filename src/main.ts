import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestContextInterceptor } from './utils/responses/request-context.interceptor';
import './instrument';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new RequestContextInterceptor());
  const port = parseInt(process.env.PORT || '3000', 10);
  try {
    await app.listen(port, '0.0.0.0');
    // eslint-disable-next-line no-console
    console.log(`App listening on http://0.0.0.0:${port}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start HTTP server:', err);
    throw err;
  }
}
void bootstrap();
