#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
FRONTEND_BUCKET="y-image-sharing-frontend-${ACCOUNT_ID}"
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name y-image-sharing-stack --query "Stacks[0].Outputs[?OutputKey=='CloudfrontDistributionId'].OutputValue" --output text)
BACKEND_URL=$(aws cloudformation describe-stacks --stack-name y-image-sharing-stack --query "Stacks[0].Outputs[?OutputKey=='BackendApiUrl'].OutputValue" --output text)

# Build frontend with production backend URL
cd ../frontend

# Update .env file with production backend URL
echo "VITE_API_URL=${BACKEND_URL}" > .env.production.local

# Install dependencies and build
npm install
npm run build

# Upload to S3
echo "Uploading frontend to S3 bucket ${FRONTEND_BUCKET}..."
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ --delete

# Invalidate CloudFront cache
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo "Invalidating CloudFront cache..."
  aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/*"
fi

# Get CloudFront domain
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks --stack-name y-image-sharing-stack --query "Stacks[0].Outputs[?OutputKey=='CloudfrontDomainName'].OutputValue" --output text)

echo "Frontend deployment completed successfully!"
echo "Frontend URL: https://${CLOUDFRONT_DOMAIN}"
