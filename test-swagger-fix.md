# Fix Swagger Configuration Issue

## Problem Identified

The error occurred because:

1. **Dependency Injection not ready**: `main.ts` was called before NestJS container was fully initialized
2. **ConfigService undefined**: `this.configService.get('NODE_ENV')` returned `undefined`
3. **Timing issue**: Swagger setup was called too early in the bootstrap process

## Solution Applied

### 1. Removed ConfigService Dependency

- Changed `SwaggerConfigService` to use `process.env` directly instead of `ConfigService`
- This avoids dependency injection issues during bootstrap

### 2. Made Methods Static

- Changed `getConfig()` and `setupSwagger()` to static methods
- This allows calling them without instantiating the class

### 3. Updated Main.ts

- Changed from: `app.get(SwaggerConfigService).setupSwagger(app)`
- Changed to: `SwaggerConfigService.setupSwagger(app)`

### 4. Cleaned Up Module

- Removed `SwaggerConfigService` from providers and exports in `SwaggerModule`

## Code Changes Made

### src/swagger/config/swagger.config.ts

```typescript
// Before: Used ConfigService with DI
constructor(private readonly configService: ConfigService) {}
getConfig(): SwaggerConfig {
  const isDevelopment = this.configService.get('NODE_ENV') === 'development';
  // ...
}

// After: Static methods with process.env
static getConfig(): SwaggerConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  // ...
}
```

### src/main.ts

```typescript
// Before: Used DI to get service
const swaggerConfigService = app.get(SwaggerConfigService);
swaggerConfigService.setupSwagger(app);

// After: Direct static method call
SwaggerConfigService.setupSwagger(app);
```

## Benefits of This Approach

1. **No DI Issues**: Static methods don't rely on dependency injection
2. **Early Bootstrap**: Can be called safely during application startup
3. **Environment Aware**: Still respects NODE_ENV for development/production
4. **Cleaner Code**: Simpler and more straightforward implementation

## Testing

To test the fix:

1. **Build the project**:

   ```bash
   npm run build
   ```

2. **Start development server**:

   ```bash
   npm run start:dev
   # or
   npm run docker:up:dev
   ```

3. **Check Swagger**:
   - Should start without errors
   - Swagger UI available at: http://localhost:3000/api/v1/docs
   - Only enabled in development environment

## Expected Result

- ✅ No more "Cannot read properties of undefined (reading 'get')" error
- ✅ Swagger documentation loads properly
- ✅ Environment-based activation still works
- ✅ All API endpoints properly documented
