#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Starting deployment of Y Image Sharing application..."

# 1. Deploy backend infrastructure using CloudFormation
echo "Deploying backend infrastructure..."
./aws-deploy.sh

# 2. Deploy Lambda function for image expiration checking
echo "Deploying Lambda function for image expiration checking..."
cd ../lambda
./deploy-lambda.sh
cd ../deployment

# 3. Deploy frontend to S3
echo "Deploying frontend to S3..."
./deploy-frontend.sh

# 4. Set up CloudFront distribution (optional)
read -p "Do you want to set up CloudFront distribution? (y/n): " setup_cloudfront
if [[ $setup_cloudfront == "y" ]]; then
  echo "Setting up CloudFront distribution..."
  ./setup-cloudfront.sh
fi

echo "Deployment completed successfully!"
echo "Frontend URL: http://y-image-sharing-frontend-697508244701.s3-website-eu-west-1.amazonaws.com/"
echo "Backend URL can be found in backend_url.txt"
echo "Lambda function 'image-expiration-checker' is configured to run every 5 minutes"
