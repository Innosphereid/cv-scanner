# Cloudinary Public Access Configuration

## Overview

Dokumen ini menjelaskan konfigurasi untuk membuat file yang diupload ke Cloudinary dapat diakses secara publik tanpa bergantung pada status aplikasi yang berjalan.

## Problem

Sebelumnya, URL Cloudinary yang dihasilkan hanya bisa diakses ketika aplikasi NestJS sedang berjalan. Ketika aplikasi mati, URL mengembalikan HTTP 401 Unauthorized.

## Solution

### 1. Upload Options Enhancement

Menambahkan explicit configuration untuk public access:

```typescript
const uploadOptions = {
  // ... existing options
  type: 'upload', // Explicitly set to 'upload' for public access
  access_mode: 'public', // Ensure public access mode
};
```

### 2. Environment Variables

Tambahkan environment variables berikut:

```bash
# Set upload type - options: 'upload', 'private', 'authenticated'
CLOUDINARY_DEFAULT_UPLOAD_TYPE=upload

# Set access mode - options: 'public', 'token'  
CLOUDINARY_DEFAULT_ACCESS_MODE=public
```

### 3. Configuration Options

| Upload Type | Access Mode | Description |
|-------------|-------------|-------------|
| `upload` | `public` | **Recommended**: File dapat diakses publik tanpa authentication |
| `private` | `public` | File private tapi bisa diakses dengan signature |
| `authenticated` | `token` | File memerlukan API key untuk akses |

## Implementation

### File Changes

1. **src/utils/uploadFile/upload.ts**
   - Added `type` and `access_mode` to upload options
   - Default values ensure public access

2. **src/utils/uploadFile/types.ts**
   - Extended `UploadOptions` interface
   - Added type safety for access control options

3. **src/cv/upload/services/cv-upload-processor.service.ts**
   - Explicit public access configuration for CV uploads

4. **src/config/cloudinary/cloudinary.config.ts**
   - Added default upload type and access mode configuration
   - Environment variable support

## Testing

### Before Changes
```bash
# URL accessible only when app is running
curl https://res.cloudinary.com/your_cloud/upload/v123/cv/file.pdf
# Returns: 401 Unauthorized (when app is down)
```

### After Changes
```bash
# URL accessible regardless of app status
curl https://res.cloudinary.com/your_cloud/upload/v123/cv/file.pdf
# Returns: 200 OK with file content
```

## Security Considerations

### Public Access (Current Implementation)
✅ **Pros:**
- Files accessible without authentication
- Works independently of application status
- Better user experience for file sharing

⚠️ **Cons:**
- Anyone with URL can access file
- No access control or expiration
- Potential data exposure if URLs leak

### Alternative Secure Options

If security is a concern, consider:

1. **Time-limited signed URLs**
2. **Private uploads with application-controlled access**
3. **Token-based authentication**

## Usage Examples

### Basic Public Upload
```typescript
const result = await uploadSingle(cloudinary, logger, fileBuffer, {
  folderPrefix: 'cv/user123',
  type: 'upload',        // Public access
  accessMode: 'public',  // No authentication required
});
```

### Private Upload (if needed)
```typescript
const result = await uploadSingle(cloudinary, logger, fileBuffer, {
  folderPrefix: 'cv/user123',
  type: 'private',       // Requires signature
  accessMode: 'public',  // But can be accessed with proper signature
});
```

## Deployment

1. Update environment variables in your deployment:
   ```bash
   CLOUDINARY_DEFAULT_UPLOAD_TYPE=upload
   CLOUDINARY_DEFAULT_ACCESS_MODE=public
   ```

2. Deploy the application

3. Test URL access with application stopped

## Troubleshooting

### Still getting 401 errors?

1. Check Cloudinary account settings
2. Verify environment variables are set correctly
3. Ensure upload type is 'upload' not 'private' or 'authenticated'
4. Check Cloudinary console for resource delivery settings

### Files not accessible?

1. Verify `access_mode` is set to 'public'
2. Check if account has delivery restrictions
3. Ensure URLs are using correct format

## References

- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference)
- [Cloudinary Access Control](https://cloudinary.com/documentation/control_access_to_media_assets)
