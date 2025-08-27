import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health.module';
import { LoggerModule } from './utils/logger.module';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './config/database/database.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

@Module({
  imports: [
    SentryModule.forRoot(),
    LoggerModule,
    AppConfigModule,
    DatabaseModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global exception filter for Sentry
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
