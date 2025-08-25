import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health.module';
import { LoggerModule } from './utils/logger.module';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './config/database/database.module';

@Module({
  imports: [LoggerModule, AppConfigModule, DatabaseModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
