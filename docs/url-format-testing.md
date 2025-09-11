# URL Format Testing Guide

## Current Issue

Getting **HTTP 404** error when accessing Cloudinary URLs when app is stopped:
```
https://res.cloudinary.com/dfbw6idel/raw/upload/v1757376757/cv/11b75eb5-4c70-4d86-9059-eac62638ab65/09e4e8b1-f371-48fc-9ad4-77b0b21f1b96-1757376754128-31ibnq.pdf
```

## Testing Strategy

### 1. Upload New File and Check Logs

After uploading, check logs for:
```json
{
  "url": "...", // Final URL being used
  "reliableUrl": "...", // Our generated URL
  "secure_url": "...", // Cloudinary's secure URL
  "alternativeUrls": [...], // Multiple format attempts
  "cloudinaryPublicId": "...", // Actual public ID from response
  "cloudinaryVersion": "..." // Version from response
}
```

### 2. Test Each URL Format

Try each URL from `alternativeUrls` in browser/phone:

1. **Standard raw with encoding**: 
   ```
   https://res.cloudinary.com/dfbw6idel/raw/upload/v123/encoded-public-id.pdf
   ```

2. **Raw without encoding**:
   ```
   https://res.cloudinary.com/dfbw6idel/raw/upload/v123/original-public-id.pdf
   ```

3. **Image resource type** (fallback):
   ```
   https://res.cloudinary.com/dfbw6idel/image/upload/v123/encoded-public-id.pdf
   ```

4. **Auto resource type**:
   ```
   https://res.cloudinary.com/dfbw6idel/auto/upload/v123/encoded-public-id.pdf
   ```

5. **Without version**:
   ```
   https://res.cloudinary.com/dfbw6idel/raw/upload/encoded-public-id.pdf
   ```

### 3. Compare with Cloudinary Original

Test the original `secure_url` from Cloudinary response to see if it works.

## Expected Results

- ✅ **One of the alternative URLs should work**
- ✅ **Cloudinary's original URL should work** (if upload options are correct)
- ❌ **If none work**: Issue is with Cloudinary account settings or upload configuration

## Next Steps Based on Results

### If Cloudinary Original URL Works:
- Use `result.secure_url` as primary URL
- Problem was with our URL generation

### If Alternative URL #X Works:
- Update `createReliablePublicUrl()` to use that format
- Use that format as primary URL

### If None Work:
- Check Cloudinary account settings
- Verify upload options (`type: 'upload'`, `access_mode: 'public'`)
- Check resource type handling

## Quick Test Commands

```bash
# Test each URL format
curl -I "URL_FROM_LOGS_1"
curl -I "URL_FROM_LOGS_2" 
curl -I "URL_FROM_LOGS_3"
# etc.
```

Look for:
- ✅ `200 OK` = URL works
- ❌ `404 Not Found` = URL format wrong
- ❌ `401 Unauthorized` = Access control issue
