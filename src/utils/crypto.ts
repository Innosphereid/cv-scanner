import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

export interface OtpHashResult {
  otpHash: string;
  salt: string;
}

export function generateNumericOtp(length: number = 6): string {
  const digits = '0123456789';
  const bytes = randomBytes(length);
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

export function hashOtpHmacSha256(
  otp: string,
  secret: string,
  salt?: string,
): OtpHashResult {
  const effectiveSalt = salt || randomBytes(16).toString('hex');
  const hmac = createHmac('sha256', secret);
  hmac.update(`${effectiveSalt}:${otp}`);
  const digest = hmac.digest('hex');
  return { otpHash: digest, salt: effectiveSalt };
}

export function verifyOtpHmacSha256(
  otp: string,
  secret: string,
  salt: string,
  otpHash: string,
): boolean {
  const computed = hashOtpHmacSha256(otp, secret, salt).otpHash;
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(otpHash, 'hex');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
