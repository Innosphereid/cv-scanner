import { registerAs } from '@nestjs/config';

export interface MailerConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export const mailerConfig = registerAs(
  'mailer',
  (): MailerConfig => ({
    host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.MAILTRAP_PORT || '2525', 10),
    user: process.env.MAILTRAP_USER || '',
    pass: process.env.MAILTRAP_PASS || '',
    fromEmail: process.env.MAIL_FROM_EMAIL || 'no-reply@example.com',
    fromName: process.env.MAIL_FROM_NAME || 'CV Scanner',
  }),
);
