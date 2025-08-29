import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from '../../entities/user.entity';
import { LoginService } from './login.service';
import { LoginController } from './login.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtTtl') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LoginController],
  providers: [LoginService],
  exports: [LoginService],
})
export class LoginModule {}
