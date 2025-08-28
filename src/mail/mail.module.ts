import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueueAsync({
      name: 'mail',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redis = config.get('redis');
        return {
          connection: {
            host: redis.host,
            port: redis.port,
            password: redis.password,
            db: redis.db,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
