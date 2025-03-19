#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IMAGE_BUCKET_NAME="y-image-sharing-app-${ACCOUNT_ID}"
FRONTEND_BUCKET_NAME="y-image-sharing-frontend-${ACCOUNT_ID}"

# Create S3 bucket for image storage if it doesn't exist
echo "Creating S3 bucket for image storage..."
aws s3api create-bucket --bucket ${IMAGE_BUCKET_NAME} --region ${AWS_REGION} || echo "Bucket already exists"

# Set CORS configuration for the image bucket
echo "Setting CORS configuration for image bucket..."
aws s3api put-bucket-cors --bucket ${IMAGE_BUCKET_NAME} --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

# Set lifecycle policy for automatic image expiration
echo "Setting lifecycle policy for image bucket..."
aws s3api put-bucket-lifecycle-configuration --bucket ${IMAGE_BUCKET_NAME} --lifecycle-configuration '{
  "Rules": [
    {
      "ID": "ExpireImages",
      "Status": "Enabled",
      "Expiration": {
        "Days": 7
      },
      "Filter": {
        "Prefix": "images/"
      }
    }
  ]
}'

# Create S3 bucket for frontend hosting if it doesn't exist
echo "Creating S3 bucket for frontend hosting..."
aws s3api create-bucket --bucket ${FRONTEND_BUCKET_NAME} --region ${AWS_REGION} || echo "Bucket already exists"

# Set website configuration for frontend bucket
echo "Setting website configuration for frontend bucket..."
aws s3 website s3://${FRONTEND_BUCKET_NAME} --index-document index.html --error-document index.html

echo "AWS infrastructure deployment completed successfully!"
echo "Image bucket: ${IMAGE_BUCKET_NAME}"
echo "Frontend bucket: ${FRONTEND_BUCKET_NAME}"
