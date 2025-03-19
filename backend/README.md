# Backend Documentation

## Architecture
- Express.js backend with TypeScript
- DynamoDB for metadata storage with TTL-based expiration
- S3 for image storage with presigned URLs
- CloudFront for secure content delivery

## Image Expiration Mechanism
The application uses DynamoDB's TTL feature for automatic image expiration:
1. User selects expiration time (5min-7days)
2. Backend calculates Unix timestamp for `expiresAt`
3. DynamoDB TTL automatically removes expired records
4. S3 objects are removed when metadata expires

## API Endpoints

### POST /v1/images
Get presigned URL for image upload
```typescript
Request:
{
  fileName: string;
  contentType: string;
  expirationMinutes: number;
}

Response:
{
  uploadUrl: string;  // Presigned URL for upload
  url: string;       // URL to access image
  expiresAt: Date;   // Expiration timestamp
}
```

### GET /v1/images/:id
Get image metadata
```typescript
Response:
{
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  expiresAt: Date;
  createdAt: string;
}
```

## DynamoDB Schema
Table: `y-image-sharing-images`
```typescript
{
  id: string;           // Partition key
  originalName: string; // Original filename
  mimeType: string;     // Content type
  size: number;         // File size in bytes
  path: string;         // S3 object key
  url: string;          // CloudFront URL
  expiresAt: number;    // TTL attribute (Unix timestamp)
  createdAt: string;    // ISO date string
}
```

## Development Setup

### Prerequisites
- Node.js 18+
- AWS Account with:
  - S3 bucket
  - DynamoDB table
  - CloudFront distribution
  - IAM credentials

### Environment Variables
```bash
# AWS Configuration
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name

# Server Configuration
PORT=8000
MAX_FILE_SIZE=10485760
NODE_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Production Deployment
```bash
# Build Docker image
docker build -t y-image-sharing-backend .

# Deploy to ECS
cd deployment
./secure-deploy-to-ecs.sh
```

## Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test ImageService.test.ts

# Run tests in watch mode
npm test -- --watch
```

## Troubleshooting

### Common Issues
1. AWS Authentication
   ```bash
   # Verify AWS credentials
   aws configure list
   aws sts get-caller-identity
   ```

2. DynamoDB TTL
   ```bash
   # Check TTL status
   aws dynamodb describe-time-to-live \
     --table-name y-image-sharing-images
   ```

3. S3 Access
   ```bash
   # Test S3 access
   aws s3 ls s3://your-bucket-name
   ```

### Monitoring
- CloudWatch Logs: `/ecs/y-image-sharing-backend`
- DynamoDB TTL Metrics in CloudWatch
- S3 Access Logs (if enabled)

## Security
- Use environment variables for secrets
- Enable HTTPS in production
- Configure proper CORS settings
- Use CloudFront for secure delivery
- Implement proper IAM roles
