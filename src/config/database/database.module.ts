import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { databaseConfig } from './database.config';
import { buildTypeOrmOptions } from './typeorm.config';
import { DatabaseConnectionLogger } from './database.connection-logger';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      inject: [databaseConfig.KEY],
      useFactory: (
        db: ConfigType<typeof databaseConfig>,
      ): TypeOrmModuleOptions => buildTypeOrmOptions(db),
    }),
  ],
  providers: [DatabaseConnectionLogger],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
