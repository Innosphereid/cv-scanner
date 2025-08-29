import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { RegisterModule } from '../../../auth/register/register.module';
import { VerifyEmailModule } from '../../../auth/verify-email/verify-email.module';
import { LoginModule } from '../../../auth/login/login.module';
import { ForgotPasswordModule } from '../../../auth/forgot-password/forgot-password.module';
import { ResetPasswordModule } from '../../../auth/reset-password/reset-password.module';

@Module({
  imports: [
    RegisterModule,
    VerifyEmailModule,
    LoginModule,
    ForgotPasswordModule,
    ResetPasswordModule,
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
          {
            path: 'auth',
            module: ForgotPasswordModule,
          },
          {
            path: 'auth',
            module: ResetPasswordModule,
          },
        ],
      },
    ]),
  ],
})
export class AuthRoutesV1Module {}
