# Resend Verification Feature

## Overview
The Resend Verification feature allows users to request a new verification email or password reset OTP when the previous one has expired or is no longer valid.

## Endpoints

### POST `/api/v1/auth/resend-verification`

Resend verification email based on the `type` query parameter.

#### Query Parameters
- `type` (required): Either `register` or `forgot-password`

#### Request Body
```json
{
  "email": "user@example.com",
  "ip": "192.168.1.1",        // optional
  "userAgent": "Mozilla/5.0..." // optional
}
```

#### Authentication Requirements
- **`type=register`**: No authentication required (anonymous)
- **`type=forgot-password`**: Authentication required (JWT token in cookie)

#### Rate Limiting
- **Register type**: 3 attempts per day per email address
- **Forgot password type**: 3 attempts per day per user

#### Response
```json
{
  "email": "user@example.com",
  "sent": true,
  "message": "Verification email sent successfully"
}
```

## Features

### 1. Register Verification Resend
- Invalidates previous verification tokens
- Generates new 5-minute TTL verification token
- Sends verification email via queue
- No authentication required
- Rate limited per email address

### 2. Forgot Password OTP Resend
- Invalidates previous OTP tokens
- Generates new 5-minute TTL OTP
- Sends OTP email via queue
- Authentication required
- Rate limited per user

## Technical Implementation

### Architecture
- **Controller**: Single endpoint handling both types
- **Service**: Business logic for token/OTP generation and email queuing
- **DTOs**: Input validation using class-validator
- **Types**: TypeScript interfaces and types
- **Rate Limiting**: Redis-based rate limiting via existing middleware

### Security Features
- Token/OTP hashing before storage
- Rate limiting to prevent abuse
- Authentication requirement for sensitive operations
- Input validation and sanitization
- Audit logging for all operations

### Dependencies
- `TypeORM` for database operations
- `MailService` for email queuing
- `RateLimiterService` for rate limiting
- `Logger` for audit logging
- `ConfigService` for configuration

## Usage Examples

### Resend Register Verification
```bash
curl -X POST "http://localhost:3000/api/v1/auth/resend-verification?type=register" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Resend Forgot Password OTP
```bash
curl -X POST "http://localhost:3000/api/v1/auth/resend-verification?type=forgot-password" \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=your_jwt_token" \
  -d '{"email": "user@example.com"}'
```

## Error Handling

### Common Error Responses
- **400 Bad Request**: Invalid email, email not registered, or invalid type parameter
- **401 Unauthorized**: Authentication required for forgot-password type
- **409 Conflict**: Email already verified (for register type)
- **429 Too Many Requests**: Rate limit exceeded

## Configuration

### Environment Variables
- `AUTH_BCRYPT_ROUNDS`: Password hashing rounds (default: 12)
- `AUTH_OTP_HMAC_SECRET`: Secret for OTP hashing
- `AUTH_APP_BASE_URL`: Base URL for verification links
- `MAILER_FROM_NAME`: Sender name for emails

## Testing

### Unit Tests
- Service methods for both verification types
- Rate limiting logic
- Token/OTP generation
- Error handling scenarios

### Integration Tests
- Endpoint behavior with different type parameters
- Authentication requirements
- Rate limiting enforcement
- Email queuing integration

## Future Enhancements

### Planned Features
- Additional verification types (e.g., phone verification)
- Customizable rate limit configurations
- Enhanced audit logging
- Webhook notifications for failed email deliveries

### Considerations
- Support for multiple email templates
- Internationalization (i18n) support
- Advanced rate limiting strategies
- Integration with external notification services
