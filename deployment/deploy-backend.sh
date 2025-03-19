#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IMAGE_BUCKET_NAME="y-image-sharing-app-${ACCOUNT_ID}"

# Build and deploy backend
cd ../backend

# Install dependencies and build
echo "Building backend..."
npm install
npm run build

# Update environment variables for production
echo "Updating environment variables..."
cat > .env << EOL
PORT=8000
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# AWS Configuration for production
AWS_REGION=${AWS_REGION}
AWS_S3_BUCKET=${IMAGE_BUCKET_NAME}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
NODE_ENV=production
USE_S3_STORAGE=true
EOL

# Build Docker image
echo "Building Docker image..."
docker build -t y-image-sharing-backend:latest .

echo "Backend build completed successfully!"
echo "To run the backend locally, use: docker run -p 8000:8000 y-image-sharing-backend:latest"
echo "Backend API will be available at: http://localhost:8000/v1"
