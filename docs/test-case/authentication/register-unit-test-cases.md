Feature: Register
User Story

As a prospective user, I want to register using my email and a strong password so that my account is created securely and I receive a verification email to activate it.

Scenario: Successful registration (happy path)
Given:
- The email is not registered (`UserRepository.findOne` returns `null`)
- `ConfigService` returns `AUTH_BCRYPT_ROUNDS=12` and `APP_BASE_URL=https://app.local`
- `bcrypt.hash` succeeds and returns a hash
- `MailService.enqueueVerificationEmail` does not throw
When:
- Calling `RegisterService.register({ email: 'User+X@Example.com ', password: 'Str0ng!Pass' })`
Then:
- A user is created via `usersRepo.create` and `usersRepo.save` with fields:
  - `email` is lowercased and trimmed: `user+x@example.com`
  - `passwordHash` is a non-empty string (result of `bcrypt.hash`)
  - `role` = `user`
  - `verified` = `false`
  - `tokenVersion` = `1`
- A verification token is created and saved via `emailTokensRepo.create/save` with:
  - `tokenHash` is 64-char hex (SHA-256), `usedAt = null`
  - `expiresAt` is about now()+5 minutes (tolerance ±5s)
- `MailService.enqueueVerificationEmail` is called once with:
  - `toEmail = normalized email`
  - `verifyUrl = APP_BASE_URL + '/verify-email?token=' + rawToken`
- The function returns `{ userId, email }` of the saved user

Scenario: Email already registered
Given:
- `UserRepository.findOne` returns an existing user
When:
- Calling `RegisterService.register({ email, password })`
Then:
- Throws `ConflictException` with message `Email already registered`
- No calls to `usersRepo.save`, `emailTokensRepo.save`, or `MailService.enqueueVerificationEmail`

Scenario: Weak password - length < 8
Given:
- Email is not registered
When:
- `RegisterService.register({ email, password: 'Ab1!' })`
Then:
- Throws `BadRequestException` with a message containing `at least 8 characters`
- No repository or mail service calls

Scenario: Weak password - missing lowercase
Given:
- Email is not registered
When:
- `RegisterService.register({ email, password: 'STRONG1!' })`
Then:
- `BadRequestException` with a message containing `lowercase`

Scenario: Weak password - missing uppercase
Given:
- Email is not registered
When:
- `RegisterService.register({ email, password: 'strong1!' })`
Then:
- `BadRequestException` with a message containing `uppercase`

Scenario: Weak password - missing number
Given:
- Email is not registered
When:
- `RegisterService.register({ email, password: 'Strong!!' })`
Then:
- `BadRequestException` with a message containing `number`

Scenario: Weak password - missing special character
Given:
- Email is not registered
When:
- `RegisterService.register({ email, password: 'Strong12' })`
Then:
- `BadRequestException` with a message containing `special character`

Scenario: Email normalization (trim + lowercase)
Given:
- Input email contains spaces and uppercase letters; it is not registered
When:
- `RegisterService.register({ email: '  USER+AbC@Example.com  ', password: 'Str0ng!Pass' })`
Then:
- `usersRepo.save` is called with `email = 'user+abc@example.com'`

Scenario: Hashing failure (bcrypt throws)
Given:
- Email is not registered
- Stub `bcrypt.hash` to throw `Error('boom')`
When:
- `RegisterService.register({ email, password: 'Str0ng!Pass' })`
Then:
- Throws `BadRequestException` with message `boom` (or `Hashing failed` as fallback)
- No token/email is created

Scenario: Mail enqueue failure (queue down)
Given:
- User is created and token is saved successfully
- `MailService.enqueueVerificationEmail` throws `Error('queue down')`
When:
- `RegisterService.register({ email, password })`
Then:
- Error is propagated (test expects a throw)
- No additional changes to user/token after the error

Scenario: Race condition on save (unique violation during save)
Given:
- `findOne` does not find a user
- `usersRepo.save` throws with `code = '23505'` (unique_violation on `email`)
When:
- `RegisterService.register({ email, password })`
Then:
- Service throws `ConflictException` (mapped from unique_violation)
- Does not proceed to token creation or email sending

Scenario: Token TTL correctness
Given:
- System time is controlled (fake timers) or compared with tolerance
When:
- Registration succeeds
Then:
- `expiresAt` ∈ [now()+5m-5s, now()+5m+5s]

Non-goals (unit scope)
- Rate limiting is verified in integration/e2e, not in the service unit tests
- DTO validation (invalid/empty email format) is tested at controller/pipe layer, not in the service