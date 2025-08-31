export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
  ip: string;
  userAgent: string;
}

export interface ResetPasswordResponse {
  email: string;
  success: boolean;
}
