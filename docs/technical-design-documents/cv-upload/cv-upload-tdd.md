## CV Upload - Technical Design Document

### Summary
Backend feature that enables authenticated users to upload CVs in PDF format, stores files in Cloudinary, and persists metadata in the database. Includes upload, detail, list, and soft delete endpoints. Parsing and analysis are out of scope.

### Goals
- Provide a secure API for CV upload (PDF, ≤ 5 MB) with cookie-based JWT authentication.
- Store files in Cloudinary under `cv/{userId}/{uuid}` and metadata in `cv_uploads`.
- Offer endpoints to fetch details, list uploads, and soft delete user-owned uploads.

### Out of Scope (Non-Goals)
- CV content parsing.
- Analysis against job descriptions.
- Antivirus/malware scanning.
- Email notifications.

### High-level Architecture
- Client → NestJS API (Controller) → Auth Guard (cookie JWT) → Rate Limiter → Multer (multipart) → Cloudinary Upload Utils → Cloudinary → PostgreSQL (`cv_uploads`).

### Authentication & Authorization
- Mechanism: JWT in cookie (session via cookie), using the project’s existing auth guard.
- All endpoints require authentication; users can only access their own resources.

### File Validation & Limits
- Format: only `application/pdf`.
- Max size: 5 MB (validated in Multer config and server-side checks).
- Metadata stripping: enabled (Cloudinary upload options disable EXIF/metadata).

### Storage
- Provider: Cloudinary.
- Path: `cv/{userId}/{uuid}` (server generates UUID v4).
- DB fields persisted:
  - `id` (uuid), `user_id`, `original_filename`, `file_size_bytes`.
  - `cloudinary_public_id`, `cloudinary_secure_url`.
  - timestamps (`created_at`, `updated_at`), `deleted_at` (soft delete).
- `file_hash` not stored for now (kept simple; can be added later).

### Rate Limiting
- Upload: 5 requests/min per user.
- Detail/List/Delete: 30 requests/min per user.
- Uses the project’s existing rate limiter middleware.

### API Design

1) POST `/v1/cv/uploads`
- Auth: cookie (JWT).
- Consumes: `multipart/form-data`, single field: `cv_file` (use client’s original filename).
- Success 201 Response:
  - `{ id: string, url: string }` where `id` is from `cv_uploads`, and `url` is `cloudinary_secure_url`.
- Typical error codes:
  - 401 `{ message, code: "AUTH_REQUIRED" }`
  - 413 `{ message, code: "FILE_TOO_LARGE" }`
  - 415 `{ message, code: "UNSUPPORTED_MEDIA_TYPE" }`
  - 429 rate limit
  - 500 unexpected upload failure

2) GET `/v1/cv/uploads/:id`
- Auth: cookie (JWT).
- Access: owner only and not soft-deleted.
- Success 200 Response:
  - `{ id, url, original_filename, file_size_bytes, created_at }`
- 404 when not found or not owned by the user.

3) GET `/v1/cv/uploads`
- Auth: cookie (JWT).
- Query: `page` (default 1), `limit` (default 10, max 50).
- Returns user-owned, not soft-deleted uploads only.
- Success 200 Response:
  - `{ items: Array<{ id, url, original_filename, file_size_bytes, created_at }>, page, limit, total }`

4) DELETE `/v1/cv/uploads/:id`
- Auth: cookie (JWT).
- Action: soft delete (`deleted_at = now()`), no Cloudinary deletion at this time.
- Success 204 (no body) or 404 if not found/not owned.

### Request/Response Examples

- POST `/v1/cv/uploads` (multipart/form-data)
  - Form fields:
    - `cv_file`: binary file (PDF, ≤ 5 MB)
  - Example cURL:
```bash
curl -X POST "https://api.example.com/v1/cv/uploads" \
  -H "Cookie: session=your_jwt_cookie" \
  -F "cv_file=@/path/to/resume.pdf;type=application/pdf"
```
  - Success 201:
```json
{
  "id": "0d1c2f1a-6d6c-4e9f-8b7e-9f3f2f46f1f1",
  "url": "https://res.cloudinary.com/demo/image/upload/v1725342345/cv/USER123/UUID.pdf"
}
```
  - Errors:
```json
{
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```
```json
{
  "message": "File exceeds 5 MB limit",
  "code": "FILE_TOO_LARGE"
}
```
```json
{
  "message": "Only PDF files are supported",
  "code": "UNSUPPORTED_MEDIA_TYPE"
}
```

- GET `/v1/cv/uploads/:id`
  - Success 200:
```json
{
  "id": "0d1c2f1a-6d6c-4e9f-8b7e-9f3f2f46f1f1",
  "url": "https://res.cloudinary.com/demo/image/upload/v1725342345/cv/USER123/UUID.pdf",
  "original_filename": "resume.pdf",
  "file_size_bytes": 483102,
  "created_at": "2025-08-31T12:34:56.789Z"
}
```
  - 404 Not Found:
```json
{
  "message": "Resource not found",
  "code": "NOT_FOUND"
}
```

- GET `/v1/cv/uploads?page=1&limit=10`
  - Success 200:
```json
{
  "items": [
    {
      "id": "0d1c2f1a-6d6c-4e9f-8b7e-9f3f2f46f1f1",
      "url": "https://res.cloudinary.com/demo/image/upload/v1725342345/cv/USER123/UUID.pdf",
      "original_filename": "resume.pdf",
      "file_size_bytes": 483102,
      "created_at": "2025-08-31T12:34:56.789Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

- DELETE `/v1/cv/uploads/:id`
  - Success 204: no body
  - 404 Not Found:
```json
{
  "message": "Resource not found",
  "code": "NOT_FOUND"
}
```

### Error Code Table

| HTTP | code                     | message (example)                 | When                                                        |
|-----:|--------------------------|-----------------------------------|-------------------------------------------------------------|
|  401 | AUTH_REQUIRED            | Authentication required           | Missing/invalid cookie JWT                                  |
|  413 | FILE_TOO_LARGE           | File exceeds 5 MB limit           | Uploaded file size > 5 MB                                   |
|  415 | UNSUPPORTED_MEDIA_TYPE   | Only PDF files are supported      | Uploaded mimetype is not `application/pdf`                  |
|  404 | NOT_FOUND                | Resource not found                | Upload does not exist, soft-deleted, or not owned by user   |
|  429 | RATE_LIMIT_EXCEEDED      | Too many requests                 | Rate limiter blocks request                                 |
|  500 | UPLOAD_FAILED            | Failed to upload file             | Cloudinary error after retries                              |
|  500 | INTERNAL_SERVER_ERROR    | Internal server error             | Unexpected server errors                                    |

Notes:
- For 429, if the project’s middleware returns a standard body, reuse it; otherwise, return `{ message, code: "RATE_LIMIT_EXCEEDED" }`.
- For 500 cases, log the full stack internally and return a generic message to clients.

### Data Model (Summary)
- Table `cv_uploads` (see `CvUploadEntity` and migration `1700000000008-create-cv-uploads.ts`):
  - `id`, `user_id`, `original_filename`, `file_size_bytes`.
  - `cloudinary_public_id`, `cloudinary_secure_url`.
  - `parsing_status` (default `pending`, currently unused), `parsing_error_message`.
  - timestamps and `deleted_at`.

### Security
- Transport: HTTPS (to Cloudinary and to clients when enabled).
- Metadata stripping: enabled via Cloudinary options (EXIF and metadata disabled).
- DB: store only URL and basic metadata; no special field-level encryption. Access scoped by auth and `user_id`.
- Input hardening: mimetype and size validation; reject non-PDF uploads.

### Observability & Logging
- Use the project logger for key events: upload start, success/failure, DB inserts.
- Handle errors with `{ message, code }` shape for common cases; record stack traces internally.
- Sentry is globally configured (see `AppModule`).

### Swagger
- Document: POST upload, GET detail, GET list, DELETE soft delete.
- Show cookie auth requirement and multipart example.

### Performance & Scalability
- Stream uploads via Cloudinary upload stream; avoid storing files on disk.
- Rate limiting prevents abuse.
- Pagination on list endpoints.

### Idempotency & Deduplication
- Always create a new entry even if the same file is uploaded (no dedup now). In the future, add `file_hash` and a unique index to support optional per-user dedup.

### Implementation Plan (High-level)
- New controller under `/v1/cv/uploads` namespace.
- Cookie-based JWT guard on the controller.
- Rate limit interceptor/decorators per endpoint.
- Multer config: single field `cv_file`, 5 MB limit, filter `application/pdf` only.
- Integrate Cloudinary using existing `uploadSingle` util; folder `cv/{userId}/{uuid}`.
- Repository/Service for insert/select/update with `user_id` scoping and `deleted_at IS NULL`.
- Swagger annotations for all endpoints above.

### Risks & Mitigations
- Client sends incorrect mimetype → Validate via Multer filter and server checks.
- Cloudinary failures → Retries (util supports attempts/delay); return 500 if exhausted.
- Cloudinary storage growth → Define retention/cleanup policy later (out of scope now).

### Security/Privacy Checklist
- [x] Auth required for all endpoints.
- [x] User scoping via `user_id`.
- [x] Metadata stripping enabled.
- [x] Store minimal metadata (URL and basic fields only).


