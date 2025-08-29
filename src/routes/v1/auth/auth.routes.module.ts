import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { RegisterModule } from '../../../auth/register/register.module';
import { VerifyEmailModule } from '../../../auth/verify-email/verify-email.module';
import { LoginModule } from '../../../auth/login/login.module';

@Module({
  imports: [
    RegisterModule,
    VerifyEmailModule,
    LoginModule,
    RouterModule.register([
      {
        path: 'api/v1',
        children: [
          {
            path: 'auth',
            module: RegisterModule,
          },
          {
            path: 'auth',
            module: VerifyEmailModule,
          },
          {
            path: 'auth',
            module: LoginModule,
          },
        ],
      },
    ]),
  ],
})
export class AuthRoutesV1Module {}
