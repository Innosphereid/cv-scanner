# Test Case: Resend Verification

## Feature: Resend Verification
**User Story**: As a user, I want to resend verification emails (either for registration or password reset) so that I can complete my account verification or reset my password when the previous email has expired.

---

## Scenario 1: Resend Register Verification - Success Flow
**Given**: A user with unverified email exists in the system
**When**: User sends POST request to `/api/v1/auth/resend-verification?type=register` with valid email
**And**: Rate limit has not been exceeded (less than 3 attempts per day)
**Then**: 
- Previous verification tokens are invalidated
- New verification token is generated with 5-minute TTL
- Verification email is enqueued for sending
- Success response (200) is returned
- Audit log is created with user info and IP

**Test Data**:
```json
{
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}
```

---

## Scenario 2: Resend Register Verification - Rate Limit Exceeded
**Given**: User has already made 3 resend attempts in the last 24 hours
**When**: User attempts to resend verification email
**Then**: 
- Rate limit check fails
- 429 Too Many Requests response is returned
- Error message includes retry time information
- No new tokens are generated
- No emails are sent

**Expected Response**:
```json
{
  "statusCode": 429,
  "message": "Too many resend attempts. Please try again after X minutes."
}
```

---

## Scenario 3: Resend Register Verification - Email Already Verified
**Given**: User's email is already verified in the system
**When**: User attempts to resend verification email
**Then**: 
- 409 Conflict response is returned
- No new tokens are generated
- No emails are sent
- Warning log is created for security monitoring

**Expected Response**:
```json
{
  "statusCode": 409,
  "message": "Email already verified"
}
```

---

## Scenario 4: Resend Register Verification - Non-existent Email
**Given**: Email address does not exist in the system
**When**: User attempts to resend verification email
**Then**: 
- 400 Bad Request response is returned
- Warning log is created with IP and User-Agent for security
- No database operations are performed
- No emails are sent

**Expected Response**:
```json
{
  "statusCode": 400,
  "message": "Email not registered"
}
```

---

## Scenario 5: Resend Forgot Password OTP - Success Flow (Authenticated)
**Given**: Authenticated user has previously requested password reset
**When**: User sends POST request to `/api/v1/auth/resend-verification?type=forgot-password` with valid JWT
**And**: Rate limit has not been exceeded
**Then**: 
- Previous OTPs are invalidated
- New OTP is generated with 5-minute TTL
- OTP email is enqueued for sending
- Success response (200) is returned
- Audit log is created

**Test Data**:
```json
{
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}
```

**Headers**:
```
Cookie: access_token=valid_jwt_token
```

---

## Scenario 6: Resend Forgot Password OTP - No Previous Password Reset Request
**Given**: User has never requested password reset before
**When**: User attempts to resend OTP email
**Then**: 
- 400 Bad Request response is returned
- Error message: "No password reset request found. Please use forgot password first."
- Warning log is created for security monitoring
- No new OTPs are generated
- No emails are sent

**Expected Response**:
```json
{
  "statusCode": 400,
  "message": "No password reset request found. Please use forgot password first."
}
```

---

## Scenario 7: Resend Forgot Password OTP - Unauthenticated Request
**Given**: User is not authenticated (no JWT token)
**When**: User attempts to resend OTP email
**Then**: 
- 401 Unauthorized response is returned
- AccessTokenGuard blocks the request
- No service methods are called
- No database operations are performed

**Expected Response**:
```json
{
  "statusCode": 401,
  "message": "Access token not found"
}
```

---

## Scenario 8: Resend Forgot Password OTP - Invalid JWT Token
**Given**: User provides expired or invalid JWT token
**When**: User attempts to resend OTP email
**Then**: 
- 401 Unauthorized response is returned
- AccessTokenGuard validates and rejects the token
- No service methods are called
- No database operations are performed

**Expected Response**:
```json
{
  "statusCode": 401,
  "message": "Invalid or expired access token"
}
```

---

## Scenario 9: Edge Case - IP Address Extraction Fallbacks
**Given**: Request object has missing or undefined IP address
**When**: Service processes the request
**Then**: 
- System uses fallback IP extraction methods
- Falls back to `req.connection.remoteAddress`
- Falls back to `req.socket.remoteAddress`
- Defaults to "unknown" if all fallbacks fail
- Request processing continues normally

**Test Cases**:
- `req.ip` is undefined
- `req.connection.remoteAddress` is undefined
- `req.socket.remoteAddress` is undefined
- All IP sources are undefined

---

## Scenario 10: Edge Case - User-Agent Extraction Fallbacks
**Given**: Request object has missing or undefined User-Agent
**When**: Service processes the request
**Then**: 
- System uses fallback User-Agent extraction
- Falls back to `req.get('User-Agent')`
- Defaults to "unknown" if all fallbacks fail
- User-Agent is truncated to 100 characters for logging
- Request processing continues normally

**Test Cases**:
- `body.userAgent` is undefined
- `req.get('User-Agent')` returns undefined
- User-Agent string is longer than 100 characters

---

## Scenario 11: Edge Case - Database Connection Issues
**Given**: Database connection is temporarily unavailable
**When**: Service attempts to perform database operations
**Then**: 
- Database errors are properly caught and logged
- Appropriate error responses are returned
- No partial operations are committed
- System remains stable and recoverable

**Test Cases**:
- Database connection timeout
- Database connection refused
- Transaction rollback scenarios

---

## Scenario 12: Edge Case - Email Service Queue Issues
**Given**: Email queue service is temporarily unavailable
**When**: Service attempts to enqueue email jobs
**Then**: 
- Queue errors are properly caught and logged
- User receives appropriate error response
- Database operations are not rolled back
- System remains stable

**Test Cases**:
- Redis connection issues
- Queue full scenarios
- Job enqueue failures

---

## Scenario 13: Edge Case - Invalid Query Parameters
**Given**: Request contains invalid or missing query parameters
**When**: Controller processes the request
**Then**: 
- 400 Bad Request response is returned
- Validation errors are properly formatted
- No service methods are called
- No database operations are performed

**Test Cases**:
- Missing `type` parameter
- Invalid `type` value (not 'register' or 'forgot-password')
- Malformed query string

---

## Scenario 14: Edge Case - Invalid Request Body
**Given**: Request body contains invalid data
**When**: Controller processes the request
**Then**: 
- 400 Bad Request response is returned
- Validation errors are properly formatted
- No service methods are called
- No database operations are performed

**Test Cases**:
- Invalid email format
- Missing required email field
- Malformed JSON body

---

## Scenario 15: Side Effects - Token Invalidation
**Given**: User has existing verification tokens or OTPs
**When**: Resend operation is performed
**Then**: 
- All previous tokens/OTPs are marked as used
- `usedAt` timestamp is set to current time
- No orphaned or duplicate tokens remain
- Database consistency is maintained

**Test Cases**:
- Multiple existing tokens
- Expired tokens
- Already used tokens

---

## Scenario 16: Side Effects - Logging and Audit
**Given**: Various operations are performed
**When**: System processes requests
**Then**: 
- All critical operations are logged
- Security events are logged with appropriate level
- User actions are tracked with IP and User-Agent
- Logs contain sufficient information for debugging

**Test Cases**:
- Successful operations
- Failed operations
- Security violations
- Rate limit violations

---

## Scenario 17: Edge Case - Concurrent Requests
**Given**: Multiple requests for the same user arrive simultaneously
**When**: System processes concurrent requests
**Then**: 
- Rate limiting prevents abuse
- Database operations are atomic
- No duplicate tokens/OTPs are generated
- System maintains data consistency

**Test Cases**:
- Same user, same type
- Same user, different types
- Different users, same email

---

## Scenario 18: Edge Case - Token/OTP Generation Failures
**Given**: Cryptographic operations fail
**When**: Service attempts to generate tokens/OTPs
**Then**: 
- Errors are properly caught and logged
- User receives appropriate error response
- No partial data is saved to database
- System remains secure

**Test Cases**:
- Random number generation failures
- Hash generation failures
- Salt generation failures

---

## Scenario 19: Email Template Validation
**Given**: Verification email is generated
**When**: Email job is processed
**Then**: 
- Email contains correct verification link/OTP
- Email formatting is proper for different clients
- Email subject line is appropriate and clear
- Email body contains all required information
- Links are properly formatted and clickable

**Test Cases**:
- HTML email rendering in different email clients
- Plain text email fallback
- Mobile email client compatibility
- Link validation and accessibility
- Email template localization (if applicable)

**Expected Email Content**:
```html
Subject: Verify Your Email Address
Body: Contains verification link with proper formatting
Footer: Unsubscribe and support information
```

---

## Scenario 20: Token Collision Prevention
**Given**: High volume of token generation
**When**: Multiple tokens are generated simultaneously
**Then**: 
- All tokens are cryptographically unique
- No collisions occur in the database
- Token generation maintains entropy
- Database constraints prevent duplicates
- System performance is not degraded

**Test Cases**:
- Concurrent token generation (100+ simultaneous requests)
- Token uniqueness validation
- Database constraint enforcement
- Performance under load
- Entropy source validation

**Performance Metrics**:
- Token generation time: < 100ms per token
- Collision probability: < 1 in 10^15
- Database insertion success rate: 100%

---

## Scenario 21: Expired Token Cleanup
**Given**: System has many expired tokens
**When**: Cleanup job runs
**Then**: 
- Expired tokens are properly removed
- Database performance is maintained
- Cleanup job is efficient and non-blocking
- Orphaned tokens are identified and removed
- Database indexes remain optimized

**Test Cases**:
- Large volume of expired tokens (10,000+)
- Cleanup job performance under load
- Database index maintenance
- Transaction isolation during cleanup
- Rollback scenarios if cleanup fails

**Cleanup Job Metrics**:
- Cleanup execution time: < 30 seconds for 10k tokens
- Database performance impact: < 5% during cleanup
- Memory usage: < 100MB during cleanup
- Rollback time: < 10 seconds if needed

---

## Test Data Requirements

### Valid Test Users
```json
{
  "unverified_user": {
    "email": "unverified@example.com",
    "verified": false,
    "hasVerificationTokens": true
  },
  "verified_user": {
    "email": "verified@example.com",
    "verified": true,
    "hasVerificationTokens": false
  },
  "forgot_password_user": {
    "email": "forgot@example.com",
    "verified": true,
    "hasOtpHistory": true
  },
  "no_history_user": {
    "email": "nohistory@example.com",
    "verified": true,
    "hasOtpHistory": false
  }
}
```

### Rate Limiting Test Data
```json
{
  "rate_limit_keys": {
    "register": "resend_register:user@example.com",
    "forgot_password": "resend_forgot_password:user@example.com"
  },
  "limits": {
    "max_attempts": 3,
    "time_window": "24 hours"
  }
}
```

### Error Response Templates
```json
{
  "400_bad_request": {
    "statusCode": 400,
    "message": "Bad Request",
    "error": "Bad Request"
  },
  "401_unauthorized": {
    "statusCode": 401,
    "message": "Unauthorized",
    "error": "Unauthorized"
  },
  "409_conflict": {
    "statusCode": 409,
    "message": "Conflict",
    "error": "Conflict"
  },
  "429_too_many_requests": {
    "statusCode": 429,
    "message": "Too Many Requests",
    "error": "Too Many Requests"
  }
}
```
