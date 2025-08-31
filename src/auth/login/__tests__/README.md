# Login Module Test Suite

## Overview

This directory contains comprehensive unit tests for the Login feature, covering both `LoginService` and `LoginController` with all scenarios from the test case document.

## Test Structure

### Files

- `login.service.spec.ts` - Tests for LoginService business logic
- `login.controller.spec.ts` - Tests for LoginController HTTP handling
- `test-utils.ts` - Common test utilities and mock factories
- `jest.config.ts` - Jest configuration for the login module
- `jest.setup.ts` - Global test setup and mocks

### Test Coverage

#### LoginService Tests

- ✅ **Scenario 1**: Successful Login with Valid Credentials
- ✅ **Scenario 2**: Login Failed - User Not Found
- ✅ **Scenario 3**: Login Failed - Email Not Verified
- ✅ **Scenario 4**: Login Failed - Account Locked
- ✅ **Scenario 5**: Login Failed - Wrong Password (Below Lockout Threshold)
- ✅ **Scenario 6**: Login Failed - Wrong Password (Reaching Lockout Threshold)
- ✅ **Scenario 7**: Successful Login After Lockout (Account Already Unlocked)
- ✅ **Scenario 8**: Login Failed - Error in Password Verification
- ✅ **Scenario 9**: JWT Token Generation with Custom TTL
- ✅ **Scenario 10**: JWT Token Generation with Default TTL
- ✅ **Edge Cases**: Email Normalization, Lockout Duration, JWT TTL Parsing

#### LoginController Tests

- ✅ **Scenario 11**: Controller Login Success
- ✅ **Scenario 12**: Controller Login Failed - Validation Error
- ✅ **Scenario 13**: Controller Login Failed - Service Exception
- ✅ **Scenario 14**: Controller Login - IP Address Detection
- ✅ **Scenario 15**: Controller Login - Cookie Security Properties (Production)
- ✅ **Scenario 16**: Controller Login - Cookie Security Properties (Development)
- ✅ **Scenario 17**: Controller Login - Request Metadata Handling
- ✅ **Scenario 18**: Controller Login - User Agent Truncation
- ✅ **Edge Cases**: Missing data handling, null responses

## Running Tests

### Run All Tests

```bash
npm test src/auth/login/__tests__/
```

### Run Specific Test File

```bash
npm test login.service.spec.ts
npm test login.controller.spec.ts
```

### Run with Coverage

```bash
npm test -- --coverage src/auth/login/__tests__/
```

### Run in Watch Mode

```bash
npm test -- --watch src/auth/login/__tests__/
```

### Run with Verbose Output

```bash
npm test -- --verbose src/auth/login/__tests__/
```

## Test Utilities

### Mock Factories

- `createMockUser()` - Creates mock UserEntity with customizable properties
- `createMockLoginRequest()` - Creates mock LoginRequest DTO
- `createMockLoginResponse()` - Creates mock LoginResponse
- `createMockRequest()` - Creates mock Express Request
- `createMockResponse()` - Creates mock Express Response
- `createMockSuccessBuilder()` - Creates mock SuccessBuilder
- `createMockErrorBuilder()` - Creates mock ErrorBuilder

### Constants

- `TEST_CONSTANTS` - Common test data constants
- `TEST_SCENARIOS` - Predefined test scenario data

### Helper Functions

- `mockDate()` - Mocks Date for consistent testing
- `setEnvironment()` - Sets NODE_ENV for environment-specific tests
- `restoreDate()` - Restores original Date implementation

## Test Patterns

### Arrange-Act-Assert (AAA)

All tests follow the AAA pattern:

```typescript
it('should do something', async () => {
  // Arrange - Setup test data and mocks
  const mockUser = createMockUser();
  jest.spyOn(usersRepo, 'findOne').mockResolvedValue(mockUser);

  // Act - Execute the method under test
  const result = await service.login(loginRequest, ip, userAgent);

  // Assert - Verify the expected behavior
  expect(result).toEqual(expectedResponse);
});
```

### Test Data Parameterization

Uses Jest's `it.each()` for testing multiple scenarios:

```typescript
it.each(TEST_SCENARIOS.EMAIL_NORMALIZATION)(
  'should normalize email "$input" to "$expected"',
  async ({ input, expected }) => {
    // Test implementation
  },
);
```

### Mock Management

- All mocks are cleared before each test
- Mocks are restored after each test
- Environment variables are reset between tests

## Coverage Requirements

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Best Practices

### Mocking Strategy

- Mock all external dependencies (Repository, JwtService, ConfigService)
- Use realistic mock data that matches production scenarios
- Mock at the right level (service boundaries, not internal implementation)

### Test Isolation

- Each test is independent and doesn't affect others
- Database state is mocked, not persisted
- Environment variables are reset between tests

### Error Testing

- Test both happy path and error scenarios
- Verify correct exception types and messages
- Test edge cases and boundary conditions

### Security Testing

- Test authentication and authorization flows
- Verify cookie security properties
- Test rate limiting and lockout mechanisms

## Troubleshooting

### Common Issues

1. **Mock not working**: Ensure mocks are set up in `beforeEach` and cleared in `afterEach`
2. **Date inconsistencies**: Use `mockDate()` helper for time-dependent tests
3. **Environment issues**: Use `setEnvironment()` helper for environment-specific tests
4. **Async test failures**: Ensure proper `async/await` usage and error handling

### Debug Mode

Run tests with Node.js debugger:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand login.service.spec.ts
```

## Contributing

When adding new tests:

1. Follow the existing naming conventions
2. Use the provided mock factories
3. Add test data to `TEST_SCENARIOS` if reusable
4. Ensure proper test isolation
5. Update this README with new scenarios
