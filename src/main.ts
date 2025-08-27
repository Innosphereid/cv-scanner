import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestContextInterceptor } from './utils/responses/request-context.interceptor';
import '../instrument';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new RequestContextInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
