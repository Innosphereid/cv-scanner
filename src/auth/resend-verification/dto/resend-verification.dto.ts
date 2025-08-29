import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ResendVerificationType } from '../types';

export class ResendVerificationQueryDto {
  @IsEnum(['register', 'forgot-password'], {
    message: 'Type must be either "register" or "forgot-password"',
  })
  type: ResendVerificationType;
}

export class ResendVerificationBodyDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

export class ResendVerificationRequestDto {
  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
