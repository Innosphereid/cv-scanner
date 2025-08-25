import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { databaseConfig } from './database/database.config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.NODE_ENV === 'test'
          ? '.env.test'
          : process.env.NODE_ENV === 'development'
            ? '.env.development'
            : '.env',
      ],
      load: [databaseConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3000),

        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().required(),
        DB_NAME: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').required(),
        DB_SCHEMA: Joi.string().default('public'),
        DB_SSL: Joi.boolean()
          .truthy('true', '1')
          .falsy('false', '0')
          .default(false),
        DB_MAX_CONNECTIONS: Joi.number().integer().min(1).default(10),
        DB_IDLE_TIMEOUT: Joi.number().integer().min(1000).default(10000),
        DB_CONN_TIMEOUT: Joi.number().integer().min(1000).default(10000),
        DB_LOGGING: Joi.boolean()
          .truthy('true', '1')
          .falsy('false', '0')
          .default(false),
        DB_REJECT_UNAUTHORIZED: Joi.boolean()
          .truthy('true', '1')
          .falsy('false', '0')
          .default(true),
      }),
    }),
  ],
})
export class AppConfigModule {}
