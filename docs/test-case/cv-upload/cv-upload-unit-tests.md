# CV Upload - Unit Test Cases

## Feature: CV Upload
**User Story**: As an authenticated user, I want to upload my CV in PDF format so that I can store it securely in the system for future analysis.

---

## Controller Tests (CvUploadController)

### Scenario: Successful CV Upload
**Given:**
- User is authenticated with valid JWT token in cookie
- User has not exceeded rate limit (5 requests per minute)
- File is valid PDF format (application/pdf)
- File size is within limit (≤ 5MB)
- Cloudinary upload succeeds
- Database save operation succeeds

**When:**
- User sends POST request to `/v1/cv/uploads` with multipart/form-data
- File field name is "cv_file"
- Request includes valid access_token cookie

**And:**
- Multer parses file successfully
- File passes validation checks
- Service handles upload successfully

**Then:**
- Controller returns 201 Created status
- Response contains upload ID and Cloudinary URL
- SuccessBuilder response format is correct
- Logger records successful upload

---

### Scenario: Authentication Failure - Missing Token
**Given:**
- User is not authenticated
- No access_token cookie present in request

**When:**
- User sends POST request to `/v1/cv/uploads` without authentication

**Then:**
- AccessTokenGuard throws UnauthorizedException
- Controller returns 401 Unauthorized
- Error message indicates authentication required

---

### Scenario: Authentication Failure - Invalid Token
**Given:**
- User provides invalid/expired JWT token in cookie
- Token fails JWT verification

**When:**
- User sends POST request with invalid access_token cookie

**Then:**
- AccessTokenGuard throws UnauthorizedException
- Controller returns 401 Unauthorized
- Error message indicates invalid or expired token

---

### Scenario: Authentication Failure - Expired Token
**Given:**
- User provides expired JWT token in cookie
- Token has valid format but past expiration time

**When:**
- User sends POST request with expired access_token cookie

**Then:**
- AccessTokenGuard throws UnauthorizedException
- Controller returns 401 Unauthorized
- Error message indicates invalid or expired token

---

### Scenario: Rate Limit Exceeded
**Given:**
- User is authenticated with valid token
- User has already made 5 upload requests in the last minute
- Rate limiter blocks the request

**When:**
- User attempts to upload CV (6th request in 1 minute)

**Then:**
- RateLimitInterceptor throws rate limit exception
- Controller returns 429 Too Many Requests
- Request is blocked before reaching upload logic

---

### Scenario: File Validation Failure - Wrong MIME Type
**Given:**
- User is authenticated with valid token
- User has not exceeded rate limit
- File is not PDF format (e.g., image/jpeg, text/plain)

**When:**
- User sends POST request with non-PDF file

**Then:**
- Multer fileFilter rejects file with UNSUPPORTED_MEDIA_TYPE error
- Controller throws HttpException with 415 status
- Error message indicates only PDF files are supported

---

### Scenario: File Validation Failure - File Too Large
**Given:**
- User is authenticated with valid token
- User has not exceeded rate limit
- File is PDF format but exceeds 5MB limit

**When:**
- User sends POST request with oversized PDF file

**Then:**
- Multer limits reject file or controller validation fails
- Controller throws HttpException with 413 status
- Error message indicates file exceeds 5MB limit

---

### Scenario: File Validation Failure - Server-side MIME Check
**Given:**
- User is authenticated with valid token
- User has not exceeded rate limit
- File passes Multer filter but has incorrect MIME type
- File size is within limit

**When:**
- User sends POST request with file that bypasses Multer filter

**And:**
- Controller performs additional server-side validation

**Then:**
- Controller throws HttpException with 415 status
- Error message indicates only PDF files are supported

---

### Scenario: File Validation Failure - Server-side Size Check
**Given:**
- User is authenticated with valid token
- User has not exceeded rate limit
- File is PDF format but exceeds 5MB
- File somehow bypasses Multer size limit

**When:**
- User sends POST request with oversized file

**And:**
- Controller performs additional server-side size validation

**Then:**
- Controller throws HttpException with 413 status
- Error message indicates file exceeds 5MB limit

---

### Scenario: Missing File Field
**Given:**
- User is authenticated with valid token
- User has not exceeded rate limit
- Request does not include cv_file field

**When:**
- User sends POST request without file field

**Then:**
- Multer does not provide file object
- Controller receives undefined file parameter
- Service call fails or throws appropriate error

---

### Scenario: Empty File Buffer
**Given:**
- User is authenticated with valid token
- User has not exceeded rate limit
- File field is present but buffer is empty or undefined

**When:**
- User sends POST request with empty file

**Then:**
- Controller passes empty buffer to service
- Service or Cloudinary upload fails
- Appropriate error is returned

---

### Scenario: Service Upload Failure
**Given:**
- User is authenticated with valid token
- User has not exceeded rate limit
- File passes all validations
- CvUploadService.handleUpload throws error

**When:**
- User sends valid upload request

**And:**
- Service fails due to Cloudinary or database error

**Then:**
- Controller propagates service error
- User receives appropriate error response
- Error is logged properly

---

## Service Tests (CvUploadService)

### Scenario: Successful Upload Processing
**Given:**
- Valid HandleUploadInput with all required fields
- Cloudinary upload succeeds
- Database save operation succeeds
- Logger is available

**When:**
- Service.handleUpload is called with valid input

**And:**
- uploadSingle utility returns successful result
- Repository save operation completes

**Then:**
- Service returns HandleUploadResult with ID and URL
- Database entity is created with correct fields
- Logger records successful persistence
- Generated folder prefix follows cv/{userId}/{uuid} format

---

### Scenario: Cloudinary Upload Failure
**Given:**
- Valid HandleUploadInput with all required fields
- Cloudinary service is unavailable or returns error
- uploadSingle utility throws error

**When:**
- Service.handleUpload is called

**And:**
- uploadSingle fails after retries

**Then:**
- Service propagates Cloudinary error
- No database record is created
- Error is logged appropriately

---

### Scenario: Database Save Failure
**Given:**
- Valid HandleUploadInput with all required fields
- Cloudinary upload succeeds
- Database save operation fails
- Repository throws error

**When:**
- Service.handleUpload is called

**And:**
- uploadSingle succeeds but repo.save fails

**Then:**
- Service propagates database error
- Cloudinary upload is not rolled back
- Error is logged appropriately

---

### Scenario: Invalid Input - Missing User ID
**Given:**
- HandleUploadInput with empty or null userId
- Other fields are valid

**When:**
- Service.handleUpload is called with invalid input

**Then:**
- Service throws appropriate error
- No upload or database operation occurs

---

### Scenario: Invalid Input - Missing File Buffer
**Given:**
- HandleUploadInput with empty or null bufferOrPath
- Other fields are valid

**When:**
- Service.handleUpload is called with invalid input

**Then:**
- Service throws appropriate error
- No upload or database operation occurs

---

### Scenario: Concurrent Uploads - Same User
**Given:**
- Multiple valid HandleUploadInput requests from same user
- All requests have different file content
- Cloudinary and database can handle concurrent operations

**When:**
- Multiple service.handleUpload calls are made simultaneously

**Then:**
- All uploads should succeed independently
- Each upload gets unique folder prefix with different UUID
- Database records are created for each upload
- No race conditions occur

---

## Utility Tests (uploadSingle)

### Scenario: Successful File Upload
**Given:**
- Valid file buffer with PDF content
- Cloudinary client is available and responsive
- Valid folder prefix provided
- Logger is available

**When:**
- uploadSingle is called with valid parameters

**And:**
- Cloudinary upload stream completes successfully

**Then:**
- Function returns UploadResult with URL, publicId, size, format, checksum
- Generated publicId follows folder prefix pattern
- Checksum is computed correctly
- Logger records successful upload

---

### Scenario: Cloudinary Network Failure
**Given:**
- Valid file buffer with PDF content
- Cloudinary client throws network error
- Retry configuration allows multiple attempts

**When:**
- uploadSingle is called with valid parameters

**And:**
- Cloudinary upload fails on all retry attempts

**Then:**
- Function throws error after exhausting retries
- Logger records failed attempts
- Error message indicates upload failure

---

### Scenario: Cloudinary Partial Success with Retry
**Given:**
- Valid file buffer with PDF content
- Cloudinary client fails on first attempt but succeeds on retry
- Retry configuration allows multiple attempts

**When:**
- uploadSingle is called with valid parameters

**And:**
- First Cloudinary attempt fails, second succeeds

**Then:**
- Function returns successful UploadResult
- Logger records retry attempt and final success
- Total attempts match expected retry count

---

### Scenario: Invalid File Buffer
**Given:**
- Invalid or corrupted file buffer
- Cloudinary client is available

**When:**
- uploadSingle is called with invalid buffer

**Then:**
- Function throws appropriate error
- No upload attempt is made
- Error is logged properly

---

### Scenario: Empty File Buffer
**Given:**
- Empty file buffer
- Cloudinary client is available

**When:**
- uploadSingle is called with empty buffer

**Then:**
- Function throws appropriate error
- No upload attempt is made
- Error is logged properly

---

### Scenario: Boundary Size Testing - Exactly 5MB
**Given:**
- File buffer with exactly 5MB of data
- Cloudinary client is available
- File passes size validation

**When:**
- uploadSingle is called with 5MB file

**Then:**
- Function processes file successfully
- UploadResult contains correct size information
- No size-related errors occur

---

### Scenario: Boundary Size Testing - Just Under 5MB
**Given:**
- File buffer with 4.99MB of data
- Cloudinary client is available
- File passes size validation

**When:**
- uploadSingle is called with file just under limit

**Then:**
- Function processes file successfully
- UploadResult contains correct size information
- No size-related errors occur

---

### Scenario: Special Characters in Filename
**Given:**
- File with special characters in original filename
- Valid file buffer with PDF content
- Cloudinary client is available

**When:**
- uploadSingle is called with special character filename

**Then:**
- Function processes file successfully
- Generated publicId handles special characters appropriately
- No encoding issues occur

---

### Scenario: Very Long Filename
**Given:**
- File with extremely long filename (>255 characters)
- Valid file buffer with PDF content
- Cloudinary client is available

**When:**
- uploadSingle is called with long filename

**Then:**
- Function processes file successfully
- Generated publicId handles long filename appropriately
- No truncation issues occur

---

### Scenario: Corrupted PDF File
**Given:**
- File buffer with .pdf extension but corrupted content
- Cloudinary client is available
- File passes MIME type validation

**When:**
- uploadSingle is called with corrupted PDF

**Then:**
- Function processes file successfully (Cloudinary accepts it)
- UploadResult is returned normally
- No content validation errors occur

---

## Edge Cases and Boundary Testing

### Scenario: Maximum File Size Boundary
**Given:**
- File with size exactly at 5MB limit
- All other validations pass

**When:**
- Upload request is made with maximum size file

**Then:**
- File passes size validation
- Upload completes successfully
- No boundary-related errors occur

---

### Scenario: Minimum Valid File Size
**Given:**
- File with very small size (e.g., 1KB) but valid PDF
- All other validations pass

**When:**
- Upload request is made with minimal size file

**Then:**
- File passes all validations
- Upload completes successfully
- No minimum size errors occur

---

### Scenario: Unicode Characters in Filename
**Given:**
- File with Unicode characters in filename (e.g., résumé.pdf)
- Valid file buffer with PDF content

**When:**
- Upload request is made with Unicode filename

**Then:**
- File passes all validations
- Filename is handled correctly in database
- No encoding issues occur

---

### Scenario: Multiple Dots in Filename
**Given:**
- File with multiple dots in filename (e.g., my.cv.final.pdf)
- Valid file buffer with PDF content

**When:**
- Upload request is made with complex filename

**Then:**
- File passes all validations
- Filename is stored correctly in database
- No parsing issues occur

---

### Scenario: Empty Filename
**Given:**
- File with empty or null filename
- Valid file buffer with PDF content

**When:**
- Upload request is made with empty filename

**Then:**
- System handles empty filename gracefully
- Default filename or error handling is applied
- Upload completes or fails appropriately

---

## Error Handling and Recovery

### Scenario: Cloudinary Service Unavailable
**Given:**
- Cloudinary service is completely unavailable
- Network timeout or service down
- Retry configuration is set

**When:**
- Upload request is made

**Then:**
- System attempts retries as configured
- After exhausting retries, appropriate error is returned
- Error message indicates service unavailable

---

### Scenario: Database Connection Failure
**Given:**
- Database is unavailable or connection fails
- Cloudinary upload succeeds
- Repository operations fail

**When:**
- Upload request is made

**Then:**
- Cloudinary upload completes successfully
- Database save fails
- Appropriate error is returned
- Cloudinary upload is not rolled back

---

### Scenario: Partial System Failure
**Given:**
- Cloudinary upload succeeds
- Database save fails
- System is in partial failure state

**When:**
- Upload request is made

**Then:**
- Cloudinary upload completes
- Database error is handled gracefully
- User receives appropriate error message
- System logs indicate partial failure

---

## Test Data Requirements

### Valid Test Files
- **Small PDF**: 1KB valid PDF file
- **Medium PDF**: 1MB valid PDF file  
- **Large PDF**: 4.9MB valid PDF file
- **Boundary PDF**: Exactly 5MB valid PDF file
- **Corrupted PDF**: File with .pdf extension but invalid content

### Invalid Test Files
- **Non-PDF**: Image files (JPEG, PNG), text files, Word documents
- **Oversized PDF**: Files larger than 5MB
- **Empty File**: Zero-byte file
- **Binary File**: Random binary data with .pdf extension

### Test Filenames
- **Normal**: `resume.pdf`
- **Unicode**: `résumé.pdf`
- **Special Characters**: `my-cv_v2.0.pdf`
- **Long Name**: 300+ character filename
- **Multiple Dots**: `my.cv.final.version.pdf`
- **Empty**: Empty string or null

### Test Scenarios Summary
- **Total Scenarios**: 35+ test cases
- **Controller Tests**: 12 scenarios
- **Service Tests**: 6 scenarios  
- **Utility Tests**: 10 scenarios
- **Edge Cases**: 7 scenarios
- **Error Handling**: 3 scenarios

Each test case should be implemented with proper mocking, assertions, and cleanup to ensure reliable and maintainable unit tests.
