# Authentication Technical Design Document

## Overview
- Scope: Backend-only authentication for single-tenant app.
- Features: Register (email+password), Email verification (link, 5m TTL), Login (JWT access-only in httpOnly cookie), Forgot password (email OTP, 5m TTL), Reset password (revoke sessions), Resend verification.
- Non-goals: 2FA for now, SSO/SAML for now. Prepare for future OAuth (Google/GitHub).

## References
- Sequence diagrams (Mermaid):
  - `docs/sequence-diagram/authentication/register.mmd`
  - `docs/sequence-diagram/authentication/resend-verification.mmd`
  - `docs/sequence-diagram/authentication/verify-email.mmd`
  - `docs/sequence-diagram/authentication/login.mmd`
  - `docs/sequence-diagram/authentication/forgot-password.mmd`
  - `docs/sequence-diagram/authentication/reset-password.mmd`

## Requirements
- Email is the unique identifier at registration; role defaults to `user`.
- Cannot login before email verification.
- Password policy: min 8 chars, lowercase, uppercase, number, special char.
- Lockout after 5 failed attempts for 15 minutes.
- JWT access-only (no refresh). Cookie: httpOnly; Secure in prod; SameSite=Lax.
- Email service: Mailtrap per environment with backend-rendered templates.
- Rate limiting (initial):
  - Register: 5/hour per IP
  - Login: 10/min per IP
  - Resend verification: 3/day per user
  - Forgot password: 3/hour per user
- Audit log required for key events.
- Follow GDPR: ability to delete account on request, minimize data, secure storage.

## APIs (base: `/api/v1/auth`)
- POST `/register`
  - body: `{ email, password }`
  - 201 on success; sends verification email job.
  - 409 if email exists; 400 if weak password; 429 if rate limited.
- POST `/resend-verification`
  - auth required (based on current session); 200 when sent; 409 if already verified; 429 if limited; 401 if not authenticated.
- GET `/verify-email?token=...`
  - 200 if verified; 400 if invalid/expired.
- POST `/login`
  - body: `{ email, password }`
  - 200 with Set-Cookie httpOnly `access_token`; 403 if not verified; 401 invalid; 423 if locked; 429 if limited.
- POST `/forgot-password`
  - body: `{ email }` (idempotent/generic response)
  - 200 always if not limited; 429 if limited.
- POST `/reset-password`
  - body: `{ email, otp, newPassword }`
  - 200 success; 400 invalid/expired OTP or weak password.
- POST `/logout` (optional but recommended)
  - clears `access_token` cookie; 200.

Notes
- Responses should use existing utils in `src/utils/responses` for success/fail shape.
- Documented in Swagger/OpenAPI with clear examples and error schemas.

## Data Model

### Table: users
- id (uuid, PK)
- email (varchar, unique, indexed)
- password_hash (varchar)
- role (varchar) default 'user'
- verified (boolean) default false
- lockout_attempts (int) default 0
- locked_until (timestamp with time zone, nullable)
- token_version (int) default 1
- created_at, updated_at (timestamps)

### Table: email_verification_tokens
- id (uuid, PK)
- user_id (uuid, FK -> users.id, indexed, cascade delete)
- token_hash (varchar, indexed)
- expires_at (timestamptz)
- used_at (timestamptz, nullable)
- created_at (timestamptz)

### Table: password_reset_otps
- id (uuid, PK)
- user_id (uuid, FK -> users.id, indexed, cascade delete)
- otp_hash (varchar, indexed)
- expires_at (timestamptz)
- used_at (timestamptz, nullable)
- created_at (timestamptz)

### Table: audit_logs
- id (uuid, PK)
- user_id (uuid, nullable for anonymous)
- event (varchar) e.g., REGISTER, RESEND_VERIFICATION, VERIFY_EMAIL, LOGIN_SUCCESS, LOGIN_FAIL, ACCOUNT_LOCKED, FORGOT_PASSWORD, RESET_PASSWORD_SUCCESS, RESET_PASSWORD_FAIL, LOGOUT
- metadata (jsonb)
- ip (varchar)
- user_agent (varchar)
- created_at (timestamptz)

## Security Design
- Passwords: bcrypt with cost 12 (configurable `AUTH_BCRYPT_ROUNDS`).
- JWT: HS256 with secret `AUTH_JWT_SECRET`; expiry 15 minutes (`AUTH_JWT_TTL=15m`). Payload includes: `sub` (userId), `role`, `tokenVersion`, `iat`, `exp`.
- Cookie: name `access_token`; httpOnly=true; secure=(NODE_ENV===production); sameSite=Lax; path=/; domain configurable `AUTH_COOKIE_DOMAIN`.
- Email tokens and OTPs stored hashed (e.g., SHA-256) to avoid plaintext secrets at rest.
- Session revocation: bump `users.token_version`; middleware validates tokenVersion in JWT against DB/Redis cache.
- Account lockout: after 5 failed attempts, set `locked_until=now()+15m` and reset attempts on successful login or after unlock.
- Rate limiting via Redis-backed middleware (IP/user-scoped buckets) using existing rate limiter config.
- Input validation via DTOs with class-validator; sanitize/normalize email (lowercase, trim).

## Email & Templates
- Provider: Mailtrap (per-environment credentials via config module).
- Templates (server-rendered with a minimal templating engine or Handlebars):
  - Verify email: includes CTA link with `verifyToken` param.
  - Reset password OTP: includes 6-digit OTP and expiry text.
- Links base URL per env: `APP_BASE_URL` (frontend) used to construct verification links.
- Background sending via queue to avoid blocking requests.

## Queueing
- Use BullMQ (Redis) queue `mail` with jobs: `sendVerificationEmail`, `sendResetOtpEmail`.
- Retry policy: up to 3 retries with exponential backoff; DLQ or log failure.

## Rate Limits (initial defaults)
- Register: key=`ip:<ip>`, 5/hour
- Login: key=`ip:<ip>`, 10/min
- Resend verification: key=`user:<userId>`, 3/day
- Forgot password: key=`user:<userId-or-email-hash>`, 3/hour

## Controllers & Modules (NestJS)
- `AuthModule`
  - Controllers: `AuthController`
  - Providers: `AuthService`, `JwtService` (Nest), `PasswordService`, `EmailVerificationService`, `PasswordResetService`, `AuditService`
  - Imports: `UsersModule`, `MailerModule`, `QueueModule`, `ConfigModule`, `RateLimiterModule`
- Middleware/Guards
  - `AccessTokenGuard`: extracts and verifies JWT from cookie; checks `tokenVersion`.
  - `RateLimiterMiddleware`: use existing rate limiter config.

## End-to-End Flow Notes
- Register: create user, enqueue verification email, 201.
- Resend verification: requires auth; invalidate previous tokens; rate limit; enqueue new email.
- Verify email: token lookup by hash; ensure not expired/used; mark verified and token used.
- Login: deny if not verified; check lockout; on success issue JWT cookie and reset attempts.
- Forgot password: generic response; create OTP; store hashed; enqueue email.
- Reset password: validate OTP; check policy; update hash; mark OTP used; bump tokenVersion.
- Logout: clear cookie; optional audit event.

## Swagger/OpenAPI
- Group: Auth.
- Document all endpoints with DTOs, examples, and error responses aligned with `src/utils/responses`.
- Security scheme: cookie-based auth with bearer JWT in cookie description.

## Observability & Audit
- Use existing logger utils (`src/utils/logger*`).
- Audit log events written to DB and application logs with correlation/request IDs when available.
- Include IP and user-agent from request headers.

## Configuration (env)
- `AUTH_BCRYPT_ROUNDS=12`
- `AUTH_JWT_SECRET=...`
- `AUTH_JWT_TTL=15m`
- `AUTH_COOKIE_DOMAIN=.example.com` (prod)
- `APP_BASE_URL=https://app.example.com`
- `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASS`
- Rate limit knobs (optional): `AUTH_RATE_LIMIT_*`

## Open Questions
- Cookie domain and exact SameSite policy in non-prod? Default Lax; confirm if `SameSite=None; Secure` is needed for cross-site frontends.
- Swagger path: do we expose at `/docs` or another route?
- Sender email/from name branding per environment?
- Do we require additional audit events (e.g., EMAIL_OPENED) or keep essentials only?
- DTO/localization: do we need i18n for email templates and error messages now or later?

## Risks & Mitigations
- Email delivery delays: async queue + retries; surface generic success to client.
- Brute force attempts: IP/user rate limits + lockout.
- Token leakage: hash stored tokens/OTPs; short TTLs; single-use.
- JWT theft: httpOnly cookie, short TTL, tokenVersion revocation.

## Rollout Plan
- Implement DB migrations for new tables/columns.
- Implement controllers/services and wire guards/middleware.
- Add Mailtrap credentials and templates.
- Add Swagger docs and examples.
- E2E tests for all flows (happy and failure paths).
