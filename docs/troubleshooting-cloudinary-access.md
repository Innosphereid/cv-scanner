# Troubleshooting Cloudinary Public Access

## Problem Description

Cloudinary URLs work when application is running but return 401 Unauthorized when application is stopped.

## Root Cause Analysis

### Most Likely Causes:

1. **PDF Resource Type Issue**: PDF files need `resource_type: 'raw'` for proper public access
2. **URL Format Issue**: Cloudinary returns URLs that may require authentication context

## Solutions Implemented

### 1. Force Raw Resource Type for PDFs

```typescript
// Force raw resource type for PDF files
const isPdfFile = mimetype === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf');
const finalResourceType = isPdfFile ? 'raw' : resourceType;

const uploadOptions = {
  resource_type: finalResourceType, // 'raw' for PDFs
  type: 'upload', // Force public upload type
  access_mode: 'public', // Force public access
};
```

### 2. Reliable Public URL Generation

```typescript
// Generate URL that definitely works without authentication
const reliableUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/v${version}/${publicId}.pdf`;
```

## Testing Steps

1. **Upload a new PDF file**
2. **Check logs for URL format**:
   ```
   Upload success publicId=cv/user123/uuid-filename {
     url: "https://res.cloudinary.com/...",
     reliableUrl: "https://res.cloudinary.com/...",
     resource_type: "raw",
     type: "upload",
     access_mode: "public"
   }
   ```
3. **Stop application completely**
4. **Test both URLs**:
   - Original URL from Cloudinary response
   - Reliable URL from our generator

## URL Format Comparison

### Before (May not work when app is down):
```
https://res.cloudinary.com/dfbw6idel/image/upload/v1757372904/cv/user-id/uuid-filename.pdf
```

### After (Should work independently):
```
https://res.cloudinary.com/dfbw6idel/raw/upload/v1757372904/cv/user-id/uuid-filename.pdf
```

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| Resource Type | `image` (auto-detected) | `raw` (explicit) |
| URL Generation | Cloudinary response | Manual construction |
| Authentication | May require context | Fully public |

## Debugging Commands

### Check Cloudinary Account Settings:
```bash
curl -X GET "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/usage" \
  -u "YOUR_API_KEY:YOUR_API_SECRET"
```

### Test URL Access:
```bash
# Test original URL
curl -I "https://res.cloudinary.com/dfbw6idel/image/upload/v123/cv/file.pdf"

# Test reliable URL  
curl -I "https://res.cloudinary.com/dfbw6idel/raw/upload/v123/cv/file.pdf"
```

## If Still Not Working

### Check Cloudinary Console:
1. Go to Cloudinary Dashboard
2. Navigate to Settings → Security
3. Ensure "Restricted media types" doesn't include PDF
4. Check "Delivery and access control" settings

### Alternative URL Formats to Try:
```typescript
// Format 1: Basic raw URL
`https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}.pdf`

// Format 2: With version
`https://res.cloudinary.com/${cloudName}/raw/upload/v${version}/${publicId}.pdf`

// Format 3: With flags
`https://res.cloudinary.com/${cloudName}/raw/upload/fl_attachment/${publicId}.pdf`
```

## Expected Outcome

After these changes:
- ✅ URLs should work when app is running
- ✅ URLs should work when app is stopped  
- ✅ PDFs should be properly categorized as 'raw' resources
- ✅ Public access should be explicitly enforced
