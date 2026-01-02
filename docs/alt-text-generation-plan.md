# Alt Text Generation Implementation Plan

## Overview
This plan addresses the failed alt text generation for newly uploaded images. The issue stems from a content-type validation problem in the Python AI service and suboptimal timing of the API call in the upload pipeline.

## Current Situation
- **Problem**: Alt text generation fails with "Bad Request" error from Python service
- **Impact**: Images are uploaded successfully but lack AI-generated alt text
- **Root Cause**: Missing content-type header when sending images to Python AI service
- **Database**: `altTexts` column exists but remains empty due to failed API calls

## Issues Identified

### 1. Content-Type Validation Failure
**Location**: `packages/server/src/shared/services/external/alt-text-api.client.ts`
**Problem**: Blob creation without content-type causes Python service to reject requests
**Evidence**:
```typescript
formData.append('image', new Blob([imageBuffer]), filename);
// Missing { type: 'image/jpeg' } option
```

### 2. Suboptimal Pipeline Timing
**Location**: `packages/server/src/features/locations/services/integrations/uploads.service.ts`
**Problem**: Alt text generation happens after all variant processing (step 7/8)
**Impact**: Delays AI processing and blocks UI response

### 3. Missing Format Context
**Problem**: Client doesn't have access to image format metadata for proper content-type detection

## Solution Approach

### Phase 1: Fix Content-Type Issue
**Goal**: Enable successful alt text generation API calls

**Changes Required**:
1. **Modify `alt-text-api.client.ts`**:
   - Add `format?: string` parameter to `generateAltText()` method
   - Implement content-type detection logic
   - Set proper Blob type: `new Blob([imageBuffer], { type: contentType })`

2. **Update `uploads.service.ts`**:
   - Pass `sourceMeta.format` to alt text generation call
   - Move alt text generation to step 4.5 (after source save, before variants)

### Phase 2: Optimize Pipeline Timing
**Goal**: Generate alt text immediately after upload, before heavy processing

**Pipeline Reordering**:
```
Current: Save Source → Process Variants → Generate Alt Text
New:     Save Source → Generate Alt Text → Process Variants
```

### Phase 3: UI Integration
**Goal**: Display alt text in the response

**Changes Required**:
- Include `altText` field in `ImageSet` response object
- Ensure UI can display the alt text field

## Implementation Steps

### Step 1: Fix Content-Type Detection (Priority: High)
**File**: `packages/server/src/shared/services/external/alt-text-api.client.ts`

```typescript
async generateAltText(imageBuffer: Buffer, filename: string, format?: string): Promise<string> {
  // Determine content type from format or filename
  let contentType = 'image/jpeg'; // default fallback
  if (format) {
    contentType = `image/${format.toLowerCase()}`;
  } else if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
  }

  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: contentType }), filename);

  // ... rest of method
}
```

### Step 2: Move Alt Text Generation Timing (Priority: Medium)
**File**: `packages/server/src/features/locations/services/integrations/uploads.service.ts`

- Move alt text generation block from step 7 to step 4.5
- Update method call to pass format: `generateAltText(Buffer.from(sourceImageBuffer), sourceFileName, sourceMeta.format)`

### Step 3: Update ImageSet Response (Priority: Low)
**File**: `packages/server/src/features/locations/services/integrations/uploads.service.ts`

```typescript
const imageSet: ImageSet = {
  id: imageSetId,
  sourceImage: { /* ... */ },
  variants,
  photographerCredit: photographerCredit || null,
  altText: altText || undefined,  // Include alt text in response
  created_at: new Date().toISOString(),
};
```

### Step 4: Remove Duplicate Code (Priority: Low)
**File**: `packages/server/src/features/locations/services/integrations/uploads.service.ts`

- Remove the old alt text generation block that was at step 7

## Testing Plan

### Unit Tests
1. **Test Content-Type Detection**:
   - Verify correct content-type for different image formats
   - Test fallback to 'image/jpeg' for unknown formats

2. **Test Alt Text API Client**:
   - Mock Python service responses
   - Verify FormData contains correct content-type headers

### Integration Tests
1. **Test Upload Pipeline**:
   - Upload image and verify alt text generation timing
   - Confirm alt text appears in API response
   - Verify database `altTexts` field is populated

2. **Test Error Handling**:
   - Simulate Python service failure
   - Verify upload succeeds without alt text
   - Check warning logs are generated

### Manual Testing
1. **UI Testing**:
   - Upload image through UI
   - Verify alt text field appears in response
   - Confirm alt text is descriptive and accurate

2. **Edge Cases**:
   - Test with different image formats (JPEG, PNG, WebP, GIF)
   - Test with very large images
   - Test with corrupted images

## Rollback Plan

### Quick Rollback (If API Issues)
1. **Disable Alt Text Generation**:
   - Comment out alt text generation call in `uploads.service.ts`
   - Keep existing error handling intact

2. **Database Cleanup** (If Needed):
   - Clear `altTexts` field for affected records
   - Reset to NULL values

### Full Rollback (If Breaking Changes)
1. **Revert Code Changes**:
   - Restore original `alt-text-api.client.ts`
   - Move alt text generation back to step 7
   - Remove `altText` from ImageSet response

2. **Database Migration** (If Schema Issues):
   - Consider removing `altTexts` column if problematic
   - Update migration files accordingly

## Success Criteria

### Functional Requirements
- [ ] Alt text generation succeeds without "Bad Request" errors
- [ ] Alt text appears in API response as `altText` field
- [ ] Alt text generation happens before variant processing
- [ ] Upload succeeds even if alt text generation fails
- [ ] Database `altTexts` field is populated with AI-generated text

### Performance Requirements
- [ ] Alt text generation doesn't significantly delay upload response
- [ ] Python service can handle concurrent requests
- [ ] Memory usage remains acceptable for large images

### Quality Requirements
- [ ] Alt text is descriptive and relevant to image content
- [ ] Error handling is robust and doesn't break uploads
- [ ] Content-type detection works for all supported formats

## Dependencies

### External Services
- Python alt-text service running on `http://localhost:8000`
- MLX-compatible hardware (Apple Silicon) for AI inference

### Internal Dependencies
- Image upload pipeline functioning correctly
- Database migrations applied successfully
- File storage system operational

## Risk Assessment

### High Risk
- **Python Service Instability**: If AI service becomes unresponsive, uploads may timeout
- **Large Image Processing**: Very large images may cause memory issues in AI service

### Medium Risk
- **Content-Type Detection**: Edge cases with unusual file extensions
- **Timing Changes**: Moving alt text generation could affect error handling flow

### Low Risk
- **UI Changes**: Adding alt text field to response is backward compatible
- **Database Changes**: `altTexts` column is nullable, existing data unaffected

## Timeline Estimate

### Phase 1 (Content-Type Fix): 2-4 hours
- Implement content-type detection logic
- Test with different image formats
- Verify Python service accepts requests

### Phase 2 (Pipeline Optimization): 1-2 hours
- Move alt text generation timing
- Update method signatures
- Remove duplicate code

### Phase 3 (UI Integration): 30 minutes - 1 hour
- Add alt text to response object
- Verify UI can display the field

### Testing: 2-4 hours
- Unit tests for content-type logic
- Integration tests for upload pipeline
- Manual testing with real images

**Total Estimate**: 6-11 hours

## Next Steps

1. **Immediate Action**: Implement content-type fix in `alt-text-api.client.ts`
2. **Testing**: Test alt text generation with a single image upload
3. **Pipeline Changes**: Move alt text generation timing
4. **UI Integration**: Add alt text field to response
5. **Full Testing**: Comprehensive testing with various image types and edge cases

## Notes

- Alt text generation is not critical for upload success - uploads should continue working even if AI service fails
- The `altTexts` database field is designed to be nullable and optional
- Python service uses BLIP + GPT-2 for generating SEO-optimized alt text (8-12 words)
- All changes should be backward compatible with existing upload functionality
