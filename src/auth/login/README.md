# Login Feature

## Overview

This module implements the login functionality for the CV Scanner application based on the authentication technical design document.

## Features

- User authentication with email and password
- Account lockout after 5 failed attempts (15 minutes duration)
- JWT token generation with configurable TTL
- Email verification requirement before login
- Rate limiting (10/min per IP)
- Comprehensive logging for security monitoring
- HTTP-only cookie for JWT storage

## API Endpoint

- **POST** `/api/v1/auth/login`
- **Rate Limit**: 10 requests per minute per IP
- **Authentication**: None required

## Request Body

```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

## Response

### Success (200 OK)

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "user"
  },
  "metadata": {
    "request_id": "uuid",
    "execution_time": 123
  },
  "status_code": 200
}
```

### Error Responses

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid credentials
- **403 Forbidden**: Email not verified
- **423 Locked**: Account locked due to multiple failed attempts
- **429 Too Many Requests**: Rate limit exceeded

## Security Features

1. **Account Lockout**: After 5 failed login attempts, account is locked for 15 minutes
2. **JWT Token**: 15-minute expiry with token version tracking
3. **HTTP-Only Cookie**: JWT stored in secure cookie
4. **Rate Limiting**: Prevents brute force attacks
5. **Input Validation**: Email normalization and password validation
6. **Comprehensive Logging**: All login attempts logged with IP and user agent

## Dependencies

- `@nestjs/jwt` - JWT token generation
- `@nestjs/typeorm` - Database operations
- `bcrypt` - Password hashing
- `cookie` - Cookie handling

## Configuration

Uses existing auth configuration from `src/config/auth/auth.config.ts`:

- `AUTH_JWT_SECRET` - JWT signing secret
- `AUTH_JWT_TTL` - JWT token lifetime (default: 15m)
- `AUTH_COOKIE_DOMAIN` - Cookie domain (optional)

## Files Structure

```
src/auth/login/
├── dto/
│   └── login.dto.ts          # Request validation
├── types/
│   └── index.ts              # Type definitions
├── exceptions/
│   └── locked.exception.ts   # Custom exception
├── login.controller.ts        # HTTP endpoint handler
├── login.service.ts          # Business logic
├── login.module.ts           # Module configuration
├── index.ts                  # Public exports
└── README.md                 # This file
```

## Usage Example

```typescript
// In your application
import { LoginModule } from './auth/login';

@Module({
  imports: [LoginModule],
  // ...
})
export class AppModule {}
```

## Testing

Unit tests can be added in the `__tests__/` directory following the existing testing patterns in the project.

## Security Considerations

- All login attempts are logged with IP address and user agent
- Passwords are never logged
- JWT tokens are stored in HTTP-only cookies
- Account lockout prevents brute force attacks
- Rate limiting prevents abuse
- Email verification required before login
