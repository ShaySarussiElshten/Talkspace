#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
FRONTEND_BUCKET="y-image-sharing-frontend-${ACCOUNT_ID}"

echo "Starting secure deployment of frontend to S3..."

# Check if .env.production exists and has VITE_API_URL
cd ../frontend
if [ -f .env.production ] && grep -q "VITE_API_URL" .env.production; then
  echo "Using existing backend URL from .env.production"
else
  # Only set default if no existing config
  if [ -f deployment/backend_public_ip.txt ]; then
    BACKEND_IP=$(cat deployment/backend_public_ip.txt)
    BACKEND_URL="http://${BACKEND_IP}:8000"
  else
    BACKEND_URL="http://localhost:8000"
  fi
  echo "VITE_API_URL=${BACKEND_URL}" > .env.production
  echo "Created .env.production with backend URL: ${BACKEND_URL}"
fi

# Install dependencies and build
echo "Installing dependencies and building frontend..."
npm install
npm run build

# Check if S3 bucket exists, create if not
echo "Checking if S3 bucket exists..."
aws s3api head-bucket --bucket ${FRONTEND_BUCKET} 2>/dev/null || aws s3 mb s3://${FRONTEND_BUCKET} --region ${AWS_REGION}

# Configure S3 bucket for static website hosting
echo "Configuring S3 bucket for static website hosting..."
aws s3 website s3://${FRONTEND_BUCKET} --index-document index.html --error-document index.html

# Set bucket policy to allow public read access
echo "Setting bucket policy to allow public read access..."

# First, disable block public access settings
echo "Disabling block public access settings..."
aws s3api put-public-access-block --bucket ${FRONTEND_BUCKET} --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Then set the bucket policy
cat > /tmp/bucket-policy.json << POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${FRONTEND_BUCKET}/*"
    }
  ]
}
POLICY

aws s3api put-bucket-policy --bucket ${FRONTEND_BUCKET} --policy file:///tmp/bucket-policy.json

# Upload to S3
echo "Uploading frontend to S3 bucket ${FRONTEND_BUCKET}..."
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ --delete

# Get S3 website URL
S3_WEBSITE_URL="http://${FRONTEND_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"

echo "Frontend deployment completed successfully!"
echo "Frontend URL: ${S3_WEBSITE_URL}"
echo "Backend URL: ${BACKEND_URL}"

# Save URLs for reference
echo "${S3_WEBSITE_URL}" > ../deployment/frontend_url.txt
echo "${BACKEND_URL}" > ../deployment/backend_url.txt

echo "Deployment information saved to deployment/frontend_url.txt and deployment/backend_url.txt"
