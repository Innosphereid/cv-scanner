import { IsEmail, IsString, Length } from 'class-validator';
import { IsStrongPassword } from '../../../utils/password-policy.validator';

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;

  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}
