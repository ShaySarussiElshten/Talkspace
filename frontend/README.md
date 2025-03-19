# Frontend Documentation

## Image Upload Flow
1. User selects image & expiration time (5min-7days)
2. Frontend requests presigned URL from backend
3. Image uploaded directly to S3 using presigned URL
4. Metadata stored in DynamoDB with TTL
5. Success modal displays countdown timer

## Environment Variables
- `VITE_API_URL`: Backend API URL (e.g., http://3.254.5.14:8000)
- `VITE_AWS_REGION`: AWS Region for services (e.g., eu-west-1)
- `VITE_S3_BUCKET`: S3 bucket for image storage

## Components

### ImageUploader
- Handles file selection via drag & drop or click
- Validates file type and size (max 10MB)
- Provides expiration time selection (5min-7days)
- Displays image preview before upload
- Shows loading state during upload

### SuccessModal
- Displays upload success confirmation
- Shows real-time countdown timer
- Provides copy-to-clipboard URL sharing
- Displays uploaded image preview
- Handles error states gracefully

## Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Testing
1. Local Development:
```bash
# Start backend first
cd ../backend
npm run dev

# Then start frontend
npm run dev
```

2. Test Image Upload:
- Select file (< 10MB)
- Choose expiration time
- Verify countdown timer
- Test URL sharing
- Check image preview

## Production Build
```bash
# Build frontend
npm run build

# Deploy to S3
cd ../deployment
./secure-deploy-frontend.sh
```

## Troubleshooting
1. CORS Issues:
   - Check backend CORS settings
   - Verify CloudFront configuration
   - Check browser console for errors

2. Upload Failures:
   - Verify backend health
   - Check AWS credentials
   - Verify S3 bucket permissions

3. Expiration Issues:
   - Check DynamoDB TTL configuration
   - Verify countdown timer accuracy
   - Monitor browser console logs
