export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  reasons: string[];
}

export interface RegisterServicePort {
  register(input: RegisterRequest): Promise<RegisterResponse>;
}
