export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  email: string;
  role: string;
  accessToken: string;
}

export interface LoginServicePort {
  login(
    input: LoginRequest,
    ip: string,
    userAgent: string,
  ): Promise<LoginResponse>;
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export interface LoginValidationResult {
  isValid: boolean;
  reasons: string[];
}

export interface UserLockoutInfo {
  isLocked: boolean;
  lockedUntil: Date | null;
  remainingAttempts: number;
  maxAttempts: number;
}
