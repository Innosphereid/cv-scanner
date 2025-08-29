# Test Case: Forgot Password

## Feature: Forgot Password
**User Story**: As a user, I want to request a password reset OTP via email so that I can reset my password when I forget it.

## Scenario 1: Successful OTP Request
**Given**: A registered user with email "john.doe@example.com" exists in the system
**When**: User sends POST request to `/api/v1/auth/forgot-password` with valid email
**And**: Rate limit has not been exceeded (less than 3 requests per hour)
**And**: Email service is available
**Then**: System should return 200 OK with success message
**And**: A 6-digit OTP should be generated and stored in database
**And**: OTP should have 5 minutes TTL
**And**: Email should be enqueued for sending
**And**: User's IP and user agent should be logged

## Scenario 2: Rate Limit Exceeded
**Given**: User has already made 3 forgot password requests in the last hour
**When**: User sends another POST request to `/api/v1/auth/forgot-password`
**Then**: System should return 429 Too Many Requests
**And**: Error message should indicate rate limit exceeded
**And**: No OTP should be generated
**And**: No email should be sent

## Scenario 3: User Not Found
**Given**: Email "nonexistent@example.com" does not exist in the system
**When**: User sends POST request to `/api/v1/auth/forgot-password` with non-existent email
**Then**: System should return 400 Bad Request
**And**: Error message should be "Email not registered"
**And**: No OTP should be generated
**And**: No email should be sent
**And**: Warning should be logged with IP address

## Scenario 4: Invalid Email Format
**Given**: User provides malformed email address
**When**: User sends POST request with invalid email format (e.g., "invalid-email")
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate invalid email format
**And**: No OTP should be generated

## Scenario 5: Empty Email
**Given**: User sends request with empty email field
**When**: User sends POST request with empty email
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate email is required

## Scenario 6: Email with Whitespace
**Given**: User provides email with leading/trailing spaces
**When**: User sends POST request with email "  john.doe@example.com  "
**Then**: System should normalize email by trimming whitespace
**And**: System should process request as if email was "john.doe@example.com"

## Scenario 7: Case Insensitive Email
**Given**: User provides email with mixed case
**When**: User sends POST request with email "John.Doe@EXAMPLE.com"
**Then**: System should normalize email to lowercase
**And**: System should process request as if email was "john.doe@example.com"

## Scenario 8: Database Connection Failure
**Given**: Database is unavailable
**When**: User sends POST request to `/api/v1/auth/forgot-password`
**Then**: System should return 500 Internal Server Error
**And**: Error should be logged
**And**: No OTP should be generated

## Scenario 9: Email Service Unavailable
**Given**: Email service is down
**When**: User sends POST request to `/api/v1/auth/forgot-password`
**Then**: System should return 500 Internal Server Error
**And**: Error should be logged
**And**: OTP should still be generated and stored
**And**: Email job should be enqueued (will fail later)

## Scenario 10: Concurrent OTP Requests
**Given**: User sends multiple forgot password requests simultaneously
**When**: Multiple requests arrive within milliseconds
**Then**: Only one OTP should be generated per request
**And**: Each request should be processed independently
**And**: Rate limiting should work correctly

## Scenario 11: OTP Generation Failure
**Given**: System fails to generate OTP due to crypto service issue
**When**: User sends POST request to `/api/v1/auth/forgot-password`
**Then**: System should return 500 Internal Server Error
**And**: Error should be logged
**And**: No OTP should be stored in database

## Scenario 12: Database Save Failure
**Given**: Database save operation fails
**When**: User sends POST request to `/api/v1/auth/forgot-password`
**Then**: System should return 500 Internal Server Error
**And**: Error should be logged
**And**: No OTP should be stored
**And**: No email should be enqueued

## Scenario 13: Email Enqueue Failure
**Given**: Email queue service is unavailable
**When**: User sends POST request to `/api/v1/auth/forgot-password`
**Then**: System should return 500 Internal Server Error
**And**: Error should be logged
**And**: OTP should be stored in database
**And**: Email job should not be enqueued

## Scenario 14: Request Metadata Missing
**Given**: Request metadata interceptor fails
**When**: User sends POST request to `/api/v1/auth/forgot-password`
**Then**: System should use default metadata values
**And**: Request should still be processed normally
**And**: Response should include default metadata

## Scenario 15: IP Address Missing
**Given**: Request IP address is not available
**When**: User sends POST request to `/api/v1/auth/forgot-password`
**Then**: System should use empty string for IP
**And**: Request should still be processed normally
**And**: Logging should handle empty IP gracefully

## Scenario 16: User Agent Missing
**Given**: Request user agent header is not present
**When**: User sends POST request to `/api/v1/auth/forgot-password`
**Then**: System should use empty string for user agent
**And**: Request should still be processed normally
**And**: Logging should handle empty user agent gracefully

## Scenario 17: OTP Hash Generation
**Given**: User requests password reset
**When**: OTP is generated
**Then**: OTP should be hashed using HMAC-SHA256
**And**: Salt should be generated for each OTP
**And**: Only hash and salt should be stored, not plain OTP
**And**: OTP should be 6 digits long

## Scenario 18: OTP Expiration Time
**Given**: OTP is generated at 10:00:00
**When**: OTP is stored in database
**Then**: OTP should expire at 10:05:00 (5 minutes later)
**And**: Expiration time should be stored as timestamp

## Scenario 19: Multiple OTPs for Same User
**Given**: User has existing unused OTP
**When**: User requests another password reset
**Then**: New OTP should be generated
**And**: Old OTP should remain unused
**And**: Both OTPs should be valid until expiration
**And**: User can use either OTP for password reset

## Scenario 20: Audit Logging
**Given**: User requests password reset
**When**: Request is processed successfully
**Then**: Info log should be created with:
- User ID
- Email address
- IP address
- User agent (truncated to 100 chars)
- Message "Forgot password OTP generated and email enqueued"
