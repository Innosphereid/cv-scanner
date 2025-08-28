export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  email: string;
  verified: boolean;
}
