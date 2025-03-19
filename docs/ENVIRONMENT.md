# Environment Setup Guide

## Required Environment Variables

### AWS Configuration
```bash
# AWS Configuration
AWS_REGION=eu-west-1                    # AWS region for resource deployment
AWS_ACCESS_KEY_ID=your-access-key       # AWS access key with required permissions
AWS_SECRET_ACCESS_KEY=your-secret-key   # AWS secret access key
AWS_S3_BUCKET=your-bucket-name         # S3 bucket for storing images

# Backend Configuration
PORT=8000                              # Port for the backend server
UPLOAD_DIR=uploads                     # Local directory for temporary uploads
MAX_FILE_SIZE=10485760                # Maximum file size (10MB)
NODE_ENV=production                    # Node environment
USE_S3_STORAGE=true                   # Enable S3 storage for images

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com

# DynamoDB Configuration
DYNAMODB_TABLE=y-image-sharing-images  # DynamoDB table for image metadata

# Lambda Configuration
LAMBDA_FUNCTION_NAME=y-image-sharing-expiration-checker  # Lambda function name
```

## Environment Files

1. **Backend Environment (.env in backend/ directory)**
```bash
PORT=8000
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
NODE_ENV=development
USE_S3_STORAGE=false
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

2. **Frontend Environment (.env in frontend/ directory)**
```bash
VITE_API_URL=http://localhost:8000
```

3. **Production Frontend Environment (.env.production in frontend/ directory)**
```bash
VITE_API_URL=http://your-backend-alb-url
```

## Setting Up Development Environment

1. **Install Dependencies:**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd frontend
npm install
```

2. **Configure Environment Variables:**
- Copy the example environment files:
```bash
# Backend
cp .env.example backend/.env

# Frontend
cp .env.example frontend/.env
```

3. **Start Development Servers:**
```bash
# Start backend
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev
```

## Production Deployment

1. **Configure AWS Credentials:**
```bash
aws configure
```

2. **Set Production Environment Variables:**
- Update `.env.production` in the frontend directory with your ALB URL
- Configure AWS environment variables for backend deployment

3. **Deploy Using Scripts:**
```bash
cd deployment
chmod +x deploy-all.sh
./deploy-all.sh
```

## Testing Environment Setup

To test your environment setup:

1. **Test Backend Health:**
```bash
curl http://localhost:8000/health
```

2. **Test Image Upload:**
```bash
# Create test image upload request
curl -X POST "http://localhost:8000/v1/images" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.jpg",
    "contentType": "image/jpeg",
    "expirationMinutes": 60
  }'
```

3. **Test Frontend Connection:**
- Open http://localhost:3000 in your browser
- Verify that you can upload and view images
