# Test Case: Reset Password

## Feature: Reset Password
**User Story**: As a user, I want to reset my password using the OTP received via email so that I can regain access to my account.

## Scenario 1: Successful Password Reset
**Given**: User has valid OTP for email "john.doe@example.com"
**When**: User sends POST request to `/api/v1/auth/reset-password` with valid OTP and strong password
**And**: OTP has not expired (within 5 minutes)
**And**: OTP has not been used before
**And**: Rate limit has not been exceeded
**Then**: System should return 200 OK with success message
**And**: User's password should be updated with new hash
**And**: User's token version should be incremented
**And**: OTP should be marked as used
**And**: All existing sessions should be revoked
**And**: Success should be logged with IP and user agent

## Scenario 2: Rate Limit Exceeded
**Given**: User has already made 3 reset password attempts in the last hour
**When**: User sends another POST request to `/api/v1/auth/reset-password`
**Then**: System should return 429 Too Many Requests
**And**: Error message should indicate rate limit exceeded
**And**: Password should not be changed
**And**: OTP should remain unused

## Scenario 3: User Not Found
**Given**: Email "nonexistent@example.com" does not exist in the system
**When**: User sends POST request to `/api/v1/auth/reset-password` with non-existent email
**Then**: System should return 400 Bad Request
**And**: Error message should be "Invalid OTP or expired"
**And**: No password should be changed

## Scenario 4: OTP Not Found
**Given**: User exists but has no OTP records
**When**: User sends POST request to `/api/v1/auth/reset-password`
**Then**: System should return 400 Bad Request
**And**: Error message should be "Invalid OTP or expired"
**And**: No password should be changed

## Scenario 5: OTP Already Used
**Given**: User has OTP that was already used for password reset
**When**: User sends POST request to `/api/v1/auth/reset-password` with used OTP
**Then**: System should return 400 Bad Request
**And**: Error message should be "Invalid OTP or expired"
**And**: No password should be changed

## Scenario 6: OTP Expired
**Given**: User has OTP that was generated more than 5 minutes ago
**When**: User sends POST request to `/api/v1/auth/reset-password` with expired OTP
**Then**: System should return 400 Bad Request
**And**: Error message should be "Invalid OTP or expired"
**And**: No password should be changed

## Scenario 7: Invalid OTP
**Given**: User provides OTP that doesn't match the stored hash
**When**: User sends POST request to `/api/v1/auth/reset-password` with invalid OTP
**Then**: System should return 400 Bad Request
**And**: Error message should be "Invalid OTP or expired"
**And**: Warning should be logged with user ID and IP
**And**: No password should be changed

## Scenario 8: Weak Password
**Given**: User provides password that doesn't meet strength requirements
**When**: User sends POST request with weak password (e.g., "123456")
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate password doesn't meet policy
**And**: No password should be changed
**And**: OTP should remain unused

## Scenario 9: Password Too Short
**Given**: User provides password with less than 8 characters
**When**: User sends POST request with short password (e.g., "Abc1!")
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate password must be at least 8 characters
**And**: No password should be changed

## Scenario 10: Password Missing Lowercase
**Given**: User provides password without lowercase letters
**When**: User sends POST request with password "ABC123!@#"
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate password must include lowercase letters
**And**: No password should be changed

## Scenario 11: Password Missing Uppercase
**Given**: User provides password without uppercase letters
**When**: User sends POST request with password "abc123!@#"
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate password must include uppercase letters
**And**: No password should be changed

## Scenario 12: Password Missing Number
**Given**: User provides password without numbers
**When**: User sends POST request with password "Abcdef!@#"
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate password must include numbers
**And**: No password should be changed

## Scenario 13: Password Missing Special Character
**Given**: User provides password without special characters
**When**: User sends POST request with password "Abcdef123"
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate password must include special characters
**And**: No password should be changed

## Scenario 14: Invalid Email Format
**Given**: User provides malformed email address
**When**: User sends POST request with invalid email format (e.g., "invalid-email")
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate invalid email format
**And**: No password should be changed

## Scenario 15: Empty Email
**Given**: User sends request with empty email field
**When**: User sends POST request with empty email
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate email is required
**And**: No password should be changed

## Scenario 16: Empty OTP
**Given**: User sends request with empty OTP field
**When**: User sends POST request with empty OTP
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate OTP must be 6 characters
**And**: No password should be changed

## Scenario 17: OTP Too Short
**Given**: User provides OTP with less than 6 characters
**When**: User sends POST request with short OTP (e.g., "12345")
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate OTP must be exactly 6 characters
**And**: No password should be changed

## Scenario 18: OTP Too Long
**Given**: User provides OTP with more than 6 characters
**When**: User sends POST request with long OTP (e.g., "1234567")
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate OTP must be exactly 6 characters
**And**: No password should be changed

## Scenario 19: Non-Numeric OTP
**Given**: User provides OTP with non-numeric characters
**When**: User sends POST request with alphanumeric OTP (e.g., "12A456")
**Then**: System should return 400 Bad Request
**And**: Validation error should indicate OTP must be exactly 6 characters
**And**: No password should be changed

## Scenario 20: Email with Whitespace
**Given**: User provides email with leading/trailing spaces
**When**: User sends POST request with email "  john.doe@example.com  "
**Then**: System should normalize email by trimming whitespace
**And**: System should process request as if email was "john.doe@example.com"

## Scenario 21: Case Insensitive Email
**Given**: User provides email with mixed case
**When**: User sends POST request with email "John.Doe@EXAMPLE.com"
**Then**: System should normalize email to lowercase
**And**: System should process request as if email was "john.doe@example.com"

## Scenario 22: Database Connection Failure
**Given**: Database is unavailable
**When**: User sends POST request to `/api/v1/auth/reset-password`
**Then**: System should return 500 Internal Server Error
**And**: Error should be logged
**And**: No password should be changed

## Scenario 23: Password Hashing Failure
**Given**: bcrypt service fails to hash password
**When**: User sends POST request to `/api/v1/auth/reset-password`
**Then**: System should return 500 Internal Server Error
**And**: Error should be logged
**And**: No password should be changed
**And**: OTP should remain unused

## Scenario 24: Database Save Failure
**Given**: Database save operation fails
**When**: User sends POST request to `/api/v1/auth/reset-password`
**Then**: System should return 500 Internal Server Error
**And**: Error should be logged
**And**: No password should be changed
**And**: OTP should remain unused

## Scenario 25: OTP Mark as Used Failure
**Given**: System fails to mark OTP as used
**When**: User sends POST request to `/api/v1/auth/reset-password`
**Then**: System should return 500 Internal Server Error
**And**: Error should be logged
**And**: Password should not be changed
**And**: OTP should remain unused

## Scenario 26: Multiple Valid OTPs
**Given**: User has multiple unused, non-expired OTPs
**When**: User sends POST request with any valid OTP
**Then**: System should use the most recent OTP (ordered by createdAt DESC)
**And**: Password should be changed successfully
**And**: Used OTP should be marked as used
**And**: Other OTPs should remain unused

## Scenario 27: Token Version Increment
**Given**: User has current token version 5
**When**: Password reset is successful
**Then**: User's token version should be incremented to 6
**And**: All existing JWT tokens should become invalid
**And**: User will need to login again

## Scenario 28: Password Hash Update
**Given**: User provides new password "NewPass123!@#"
**When**: Password reset is successful
**Then**: Old password hash should be replaced with new hash
**And**: New hash should be generated using bcrypt with configured rounds
**And**: Plain text password should not be stored

## Scenario 29: Request Metadata Missing
**Given**: Request metadata interceptor fails
**When**: User sends POST request to `/api/v1/auth/reset-password`
**Then**: System should use default metadata values
**And**: Request should still be processed normally
**And**: Response should include default metadata

## Scenario 30: IP Address Missing
**Given**: Request IP address is not available
**When**: User sends POST request to `/api/v1/auth/reset-password`
**Then**: System should use empty string for IP
**And**: Request should still be processed normally
**And**: Logging should handle empty IP gracefully

## Scenario 31: User Agent Missing
**Given**: Request user agent header is not present
**When**: User sends POST request to `/api/v1/auth/reset-password`
**Then**: System should use empty string for user agent
**And**: Request should still be processed normally
**And**: Logging should handle empty user agent gracefully

## Scenario 32: Audit Logging Success
**Given**: Password reset is successful
**When**: Request is processed
**Then**: Info log should be created with:
- User ID
- IP address
- User agent (truncated to 100 chars)
- Message "Password reset successful and sessions revoked"

## Scenario 33: Audit Logging Failure
**Given**: Password reset fails due to invalid OTP
**When**: Request is processed
**Then**: Warning log should be created with:
- User ID
- IP address
- Message "Reset password failed: invalid OTP"

## Scenario 34: Concurrent Password Reset Attempts
**Given**: User sends multiple reset password requests simultaneously
**When**: Multiple requests arrive within milliseconds
**Then**: Only one password should be changed per valid OTP
**And**: Each request should be processed independently
**And**: Rate limiting should work correctly

## Scenario 35: Strong Password Examples
**Given**: User provides various strong passwords
**When**: User sends POST request with strong passwords
**Then**: System should accept passwords like:
- "SecurePass123!@#"
- "MyP@ssw0rd"
- "Str0ng#P@ss"
- "C0mpl3x!Pass"
- "N3wP@ssw0rd!"
