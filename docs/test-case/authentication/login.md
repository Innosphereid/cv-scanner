# Test Case: Login Feature

## User Story
As a registered and verified user, I want to be able to login to the system using my email and password so I can access the application features.

## Test Cases

### LoginService Unit Tests

#### Scenario 1: Successful Login with Valid Credentials
**Given:**
- User with email "user@example.com" is registered and verified
- Input password matches the stored hash
- Account is not in locked status
- Lockout attempts = 0

**When:**
- User performs login request with correct email and password

**And:**
- Email is normalized (trimmed and converted to lowercase)
- Password is verified using bcrypt
- JWT token is generated with appropriate payload

**Then:**
- Service returns LoginResponse with userId, email, role, and accessToken
- Lockout attempts are reset to 0 if previously > 0
- Log info "Login successful" is written with userId, email, and IP
- User can access the system

**Test Data:**
```typescript
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  passwordHash: '$2b$12$hashedPassword123',
  role: 'user',
  verified: true,
  lockoutAttempts: 0,
  lockedUntil: null,
  tokenVersion: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockLoginRequest = {
  email: 'USER@EXAMPLE.COM ',
  password: 'ValidPassword123!'
};
```

#### Scenario 2: Login Failed - User Not Found
**Given:**
- Input email is not registered in the system

**When:**
- User performs login request with invalid email

**Then:**
- Service returns UnauthorizedException with message "Invalid credentials"
- Log warning "Login failed: User not found" is written with email and IP
- No database operation for lockout update

**Test Data:**
```typescript
const mockLoginRequest = {
  email: 'nonexistent@example.com',
  password: 'AnyPassword123!'
};
```

#### Scenario 3: Login Failed - Email Not Verified
**Given:**
- User with email "user@example.com" is registered
- Verified status = false

**When:**
- User performs login request with unverified email

**Then:**
- Service returns ForbiddenException with message "Please verify your email before logging in"
- Log warning "Login failed: User not verified" is written with userId, email, and IP
- No database operation for lockout update

**Test Data:**
```typescript
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  passwordHash: '$2b$12$hashedPassword123',
  role: 'user',
  verified: false,
  lockoutAttempts: 0,
  lockedUntil: null,
  tokenVersion: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};
```

#### Scenario 4: Login Failed - Account Locked
**Given:**
- User with email "user@example.com" is registered and verified
- LockedUntil status > current time (account is still locked)

**When:**
- User performs login request with locked account

**Then:**
- Service returns LockedException with message "Account locked until <timestamp>"
- Log warning "Login failed: Account locked" is written with userId, email, IP, and lockedUntil
- No database operation for lockout update

**Test Data:**
```typescript
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  passwordHash: '$2b$12$hashedPassword123',
  role: 'user',
  verified: true,
  lockoutAttempts: 5,
  lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 menit ke depan
  tokenVersion: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};
```

#### Scenario 5: Login Failed - Wrong Password (Below Lockout Threshold)
**Given:**
- User with email "user@example.com" is registered and verified
- Input password is incorrect
- Lockout attempts < 5 (not yet reaching threshold)

**When:**
- User performs login request with wrong password

**Then:**
- Service returns UnauthorizedException with message "Invalid credentials"
- Lockout attempts are incremented (+1)
- Log warning "Login failed: Invalid password" is written with userId, email, and IP
- Account is not locked

**Test Data:**
```typescript
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  passwordHash: '$2b$12$hashedPassword123',
  role: 'user',
  verified: true,
  lockoutAttempts: 2,
  lockedUntil: null,
  tokenVersion: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockLoginRequest = {
  email: 'user@example.com',
  password: 'WrongPassword123!'
};
```

#### Scenario 6: Login Failed - Wrong Password (Reaching Lockout Threshold)
**Given:**
- User with email "user@example.com" is registered and verified
- Input password is incorrect
- Lockout attempts = 4 (will reach threshold after +1)

**When:**
- User performs login request with wrong password

**Then:**
- Service returns UnauthorizedException with message "Invalid credentials"
- Lockout attempts are incremented to 5
- Account is locked with lockedUntil = now + 15 minutes
- Log warning "Account locked due to multiple failed attempts" is written
- Log warning "Login failed: Invalid password" is written

**Test Data:**
```typescript
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  passwordHash: '$2b$12$hashedPassword123',
  role: 'user',
  verified: true,
  lockoutAttempts: 4,
  lockedUntil: null,
  tokenVersion: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};
```

#### Scenario 7: Successful Login After Lockout (Account Already Unlocked)
**Given:**
- User with email "user@example.com" is registered and verified
- LockedUntil status < current time (account is already unlocked)
- Lockout attempts > 0

**When:**
- User performs login request with correct credentials

**Then:**
- Service returns LoginResponse with user data
- Lockout attempts are reset to 0
- lockedUntil is set to null
- Log info "Login successful" is written

**Test Data:**
```typescript
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  passwordHash: '$2b$12$hashedPassword123',
  role: 'user',
  verified: true,
  lockoutAttempts: 3,
  lockedUntil: new Date(Date.now() - 5 * 60 * 1000), // 5 menit yang lalu
  tokenVersion: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};
```

#### Scenario 8: Login Failed - Error in Password Verification
**Given:**
- User with email "user@example.com" is registered and verified
- bcrypt.compare() throws error

**When:**
- User performs login request

**Then:**
- Service returns UnauthorizedException with message "Invalid credentials"
- Log error "Password verification error" is written with error details
- No database operation for lockout update

**Test Data:**
```typescript
// Mock bcrypt.compare to throw error
jest.spyOn(bcrypt, 'compare').mockRejectedValue(new Error('bcrypt error'));
```

#### Scenario 9: JWT Token Generation with Custom TTL
**Given:**
- User with email "user@example.com" is registered and verified
- Config AUTH_JWT_TTL = "2h" (2 hours)

**When:**
- User performs login request with correct credentials

**Then:**
- JWT token is generated with expiry = now + 2 hours
- Payload contains sub, email, role, tokenVersion, iat, and exp appropriately

**Test Data:**
```typescript
const mockConfig = {
  get: jest.fn().mockReturnValue('2h')
};
```

#### Scenario 10: JWT Token Generation with Default TTL
**Given:**
- User with email "user@example.com" is registered and verified
- Config AUTH_JWT_TTL is missing or invalid

**When:**
- User performs login request with correct credentials

**Then:**
- JWT token is generated with expiry = now + 15 minutes (default)
- Payload contains sub, email, role, tokenVersion, iat, and exp appropriately

**Test Data:**
```typescript
const mockConfig = {
  get: jest.fn().mockReturnValue(undefined)
};
```

### LoginController Unit Tests

#### Scenario 11: Controller Login Success
**Given:**
- Valid request body with email and password
- LoginService returns LoginResponse
- Request metadata is available

**When:**
- Client performs POST request to /login

**Then:**
- Response status 200 OK
- Response body contains success message and user data (without accessToken)
- Cookie 'access_token' is set with httpOnly, secure, sameSite, path, maxAge properties
- Log info "Login successful" is written

**Test Data:**
```typescript
const mockRequest = {
  body: {
    email: 'user@example.com',
    password: 'ValidPassword123!'
  },
  requestMetadata: {
    request_id: 'req-123',
    execution_time: 150
  },
  get: jest.fn().mockReturnValue('Mozilla/5.0...'),
  socket: { remoteAddress: '192.168.1.1' }
};

const mockResponse = {
  cookie: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn()
};
```

#### Scenario 12: Controller Login Failed - Validation Error
**Given:**
- Invalid request body (wrong email format or empty password)

**When:**
- Client performs POST request to /login with invalid data

**Then:**
- Response status 400 Bad Request
- Response body contains error message and error details
- Log error "Login failed" is written with error stack

**Test Data:**
```typescript
const mockRequest = {
  body: {
    email: 'invalid-email',
    password: ''
  },
  requestMetadata: {
    request_id: 'req-123',
    execution_time: 50
  },
  get: jest.fn().mockReturnValue('Mozilla/5.0...'),
  socket: { remoteAddress: '192.168.1.1' }
};
```

#### Scenario 13: Controller Login Failed - Service Exception
**Given:**
- LoginService throws UnauthorizedException

**When:**
- Client performs POST request to /login

**Then:**
- Response status matches the exception (401 for UnauthorizedException)
- Response body contains error message from exception
- Log error "Login failed" is written with error stack

**Test Data:**
```typescript
// Mock LoginService to throw exception
jest.spyOn(loginService, 'login').mockRejectedValue(
  new UnauthorizedException('Invalid credentials')
);
```

#### Scenario 14: Controller Login - IP Address Detection
**Given:**
- Request with various IP headers (X-Forwarded-For, X-Real-IP, socket.remoteAddress)

**When:**
- Client performs POST request to /login

**Then:**
- IP address is detected with priority: X-Forwarded-For > X-Real-IP > socket.remoteAddress
- Valid IP address is passed to LoginService

**Test Data:**
```typescript
// Test case 1: X-Forwarded-For
const mockRequest1 = {
  get: jest.fn()
    .mockReturnValueOnce('192.168.1.100, 10.0.0.1') // X-Forwarded-For
    .mockReturnValueOnce('Mozilla/5.0...'), // User-Agent
  socket: { remoteAddress: '127.0.0.1' }
};

// Test case 2: X-Real-IP
const mockRequest2 = {
  get: jest.fn()
    .mockReturnValueOnce(undefined) // X-Forwarded-For
    .mockReturnValueOnce('172.16.0.100') // X-Real-IP
    .mockReturnValueOnce('Mozilla/5.0...'), // User-Agent
  socket: { remoteAddress: '127.0.0.1' }
};

// Test case 3: Fallback to socket.remoteAddress
const mockRequest3 = {
  get: jest.fn()
    .mockReturnValueOnce(undefined) // X-Forwarded-For
    .mockReturnValueOnce(undefined) // X-Real-IP
    .mockReturnValueOnce('Mozilla/5.0...'), // User-Agent
  socket: { remoteAddress: '192.168.1.50' }
};
```

#### Scenario 15: Controller Login - Cookie Security Properties
**Given:**
- Environment NODE_ENV = 'production'

**When:**
- Client performs POST request to /login

**Then:**
- Cookie 'access_token' is set with secure: true
- Cookie contains httpOnly: true, sameSite: 'lax', path: '/' properties

**Test Data:**
```typescript
// Set environment variable
process.env.NODE_ENV = 'production';

const mockRequest = {
  body: {
    email: 'user@example.com',
    password: 'ValidPassword123!'
  },
  requestMetadata: {
    request_id: 'req-123',
    execution_time: 100
  },
  get: jest.fn().mockReturnValue('Mozilla/5.0...'),
  socket: { remoteAddress: '192.168.1.1' }
};
```

#### Scenario 16: Controller Login - Cookie Non-Production Properties
**Given:**
- Environment NODE_ENV = 'development'

**When:**
- Client performs POST request to /login

**Then:**
- Cookie 'access_token' is set with secure: false
- Cookie contains httpOnly: true, sameSite: 'lax', path: '/' properties

**Test Data:**
```typescript
// Set environment variable
process.env.NODE_ENV = 'development';
```

#### Scenario 17: Controller Login - Request Metadata Handling
**Given:**
- Request without requestMetadata

**When:**
- Client performs POST request to /login

**Then:**
- Default metadata with request_id: '' and execution_time: 0 is used
- Response contains appropriate metadata

**Test Data:**
```typescript
const mockRequest = {
  body: {
    email: 'user@example.com',
    password: 'ValidPassword123!'
  },
  // No requestMetadata
  get: jest.fn().mockReturnValue('Mozilla/5.0...'),
  socket: { remoteAddress: '192.168.1.1' }
};
```

#### Scenario 18: Controller Login - User Agent Truncation
**Given:**
- User-Agent header is very long (>100 characters)

**When:**
- Client performs POST request to /login

**Then:**
- User-Agent is truncated to 100 characters before being passed to LoginService
- Log does not overflow with overly long data

**Test Data:**
```typescript
const longUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VeryLongUserAgentStringThatExceeds100Characters';

const mockRequest = {
  body: {
    email: 'user@example.com',
    password: 'ValidPassword123!'
  },
  requestMetadata: {
    request_id: 'req-123',
    execution_time: 100
  },
  get: jest.fn().mockReturnValue(longUserAgent),
  socket: { remoteAddress: '192.168.1.1' }
};
```

## Edge Cases

### Scenario 19: Email Normalization
**Given:**
- Email with whitespace and different cases

**When:**
- User performs login request

**Then:**
- Email is normalized: trimmed whitespace and converted to lowercase
- Database query uses the normalized email

**Test Data:**
```typescript
const testCases = [
  { input: ' USER@EXAMPLE.COM ', expected: 'user@example.com' },
  { input: 'User@Example.Com', expected: 'user@example.com' },
  { input: '  user@example.com  ', expected: 'user@example.com' }
];
```

### Scenario 20: Lockout Duration Calculation
**Given:**
- User reaches lockout attempts threshold

**When:**
- Account is locked

**Then:**
- lockedUntil is set to current time + 15 minutes
- Time calculation uses JavaScript Date manipulation

**Test Data:**
```typescript
const mockDate = new Date('2024-01-01T10:00:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
```

### Scenario 21: JWT TTL Parsing
**Given:**
- Config AUTH_JWT_TTL with various formats

**When:**
- JWT token is generated

**Then:**
- TTL is parsed correctly for m (minutes), h (hours), d (days) formats
- Fallback to 15 minutes if format is invalid

**Test Data:**
```typescript
const ttlTestCases = [
  { input: '15m', expected: 15 * 60 },
  { input: '2h', expected: 2 * 60 * 60 },
  { input: '1d', expected: 24 * 60 * 60 },
  { input: 'invalid', expected: 15 * 60 }, // fallback
  { input: '30s', expected: 15 * 60 } // fallback
];
```

## Test Coverage Requirements

### LoginService
- [ ] login() method - semua scenarios
- [ ] verifyPassword() method - success dan error cases
- [ ] handleFailedLogin() method - di bawah dan mencapai threshold
- [ ] resetLockoutAttempts() method
- [ ] getUserLockoutInfo() method - locked dan unlocked states
- [ ] generateAccessToken() method - berbagai TTL configs
- [ ] parseJwtTtl() method - semua format dan invalid cases

### LoginController
- [ ] login() method - success dan error handling
- [ ] getClientIp() method - semua IP detection scenarios
- [ ] Cookie setting - production dan development environments
- [ ] Response building - success dan error responses
- [ ] Request metadata handling - dengan dan tanpa metadata
- [ ] User-Agent truncation

### Exception Handling
- [ ] UnauthorizedException - invalid credentials
- [ ] ForbiddenException - email not verified
- [ ] LockedException - account locked
- [ ] HttpException - general HTTP errors
- [ ] Generic Error - unexpected errors

### Data Validation
- [ ] Email normalization
- [ ] Password verification
- [ ] Lockout logic
- [ ] JWT payload structure
- [ ] Cookie properties

### Security Features
- [ ] Rate limiting integration
- [ ] Account lockout mechanism
- [ ] JWT token security
- [ ] Cookie security properties
- [ ] IP address logging
- [ ] User-Agent logging
