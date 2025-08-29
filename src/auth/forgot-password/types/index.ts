export interface ForgotPasswordRequest {
  email: string;
  ip: string;
  userAgent: string;
}

export interface ForgotPasswordResponse {
  email: string;
  sent: boolean;
}
