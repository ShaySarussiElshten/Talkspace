#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET="y-image-sharing-app-${ACCOUNT_ID}"

echo "Starting deployment of Lambda function..."

# Build and package the Lambda function
cd ./image-expiration-checker
npm install
npm run package
cd ..

# Deploy using AWS SAM
sam deploy \
  --template-file template.yaml \
  --stack-name image-expiration-checker \
  --capabilities CAPABILITY_IAM \
  --region ${AWS_REGION} \
  --s3-bucket ${S3_BUCKET} \
  --no-fail-on-empty-changeset

echo "Lambda function deployment completed successfully!"
