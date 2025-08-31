export type ResendVerificationType = 'register' | 'forgot-password';

export interface ResendVerificationRequest {
  type: ResendVerificationType;
  email: string;
  ip?: string;
  userAgent?: string;
}

export interface ResendVerificationResponse {
  email: string;
  sent: boolean;
  message: string;
}

export interface ResendVerificationServicePort {
  resendRegisterVerification(
    input: ResendVerificationRequest,
  ): Promise<ResendVerificationResponse>;
  resendForgotPasswordVerification(
    input: ResendVerificationRequest,
  ): Promise<ResendVerificationResponse>;
}

export interface RateLimitKey {
  type: 'user' | 'email';
  identifier: string;
}

export interface TokenGenerationResult {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface OtpGenerationResult {
  otp: string;
  otpHash: string;
  salt: string;
  expiresAt: Date;
}
