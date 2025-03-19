#!/bin/bash
set -e

# Configuration
REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
IMAGE_BUCKET="y-image-sharing-app-$ACCOUNT_ID"
FRONTEND_BUCKET="y-image-sharing-frontend-$ACCOUNT_ID"
DOMAIN_NAME="api.y-image-sharing-app.com"

echo "=== Starting full deployment of the Y Image Sharing application ==="

echo "=== Building Lambda function ==="
cd ../lambda/image-expiration-checker
npm install
npm run package
cd ../../deployment

echo "=== Deploying infrastructure with Terraform ==="
cd ../terraform
terraform init
terraform apply -auto-approve
cd ../deployment

echo "=== Building and deploying backend ==="
./secure-deploy-to-ecs.sh

echo "=== Building and deploying frontend ==="
./secure-deploy-frontend.sh

echo "=== Updating Route53 DNS records ==="
./update-route53.sh

echo "=== Testing image expiration (Test 1) ==="
echo "Uploading test image with 5-minute expiration..."
UPLOAD_RESPONSE=$(curl -s -X POST -F "image=@../test/test-image.jpg" -F "expirationMinutes=5" https://$DOMAIN_NAME/upload)
IMAGE_URL=$(echo $UPLOAD_RESPONSE | jq -r '.imageUrl')
IMAGE_ID=$(echo $IMAGE_URL | awk -F'/' '{print $NF}' | awk -F'?' '{print $1}')

echo "Image uploaded successfully. URL: $IMAGE_URL"
echo "Image ID: $IMAGE_ID"
echo "Waiting 5 minutes for image to expire..."
sleep 300

echo "Testing expired image access..."
EXPIRED_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $IMAGE_URL)
echo "HTTP response code: $EXPIRED_RESPONSE (expected 404 or 403)"

echo "Checking isExpiredFlag in DynamoDB..."
IMAGE_RECORD=$(aws dynamodb get-item --table-name y-image-sharing-images --key '{"id":{"S":"'$IMAGE_ID'"}}' --region $REGION)
IS_EXPIRED=$(echo $IMAGE_RECORD | jq -r '.Item.isExpiredFlag.BOOL')
echo "isExpiredFlag value: $IS_EXPIRED (expected: true)"

echo "=== Testing image expiration (Test 2) ==="
echo "Uploading second test image with 5-minute expiration..."
UPLOAD_RESPONSE2=$(curl -s -X POST -F "image=@../test/test-image.jpg" -F "expirationMinutes=5" https://$DOMAIN_NAME/upload)
IMAGE_URL2=$(echo $UPLOAD_RESPONSE2 | jq -r '.imageUrl')
IMAGE_ID2=$(echo $IMAGE_URL2 | awk -F'/' '{print $NF}' | awk -F'?' '{print $1}')

echo "Second image uploaded successfully. URL: $IMAGE_URL2"
echo "Second image ID: $IMAGE_ID2"
echo "Waiting 5 minutes for second image to expire..."
sleep 300

echo "Testing second expired image access..."
EXPIRED_RESPONSE2=$(curl -s -o /dev/null -w "%{http_code}" $IMAGE_URL2)
echo "HTTP response code: $EXPIRED_RESPONSE2 (expected 404 or 403)"

echo "Checking isExpiredFlag in DynamoDB for second image..."
IMAGE_RECORD2=$(aws dynamodb get-item --table-name y-image-sharing-images --key '{"id":{"S":"'$IMAGE_ID2'"}}' --region $REGION)
IS_EXPIRED2=$(echo $IMAGE_RECORD2 | jq -r '.Item.isExpiredFlag.BOOL')
echo "isExpiredFlag value: $IS_EXPIRED2 (expected: true)"

echo "=== Deployment and testing complete ==="
echo "Frontend URL: https://d13hvexao8k7i5.cloudfront.net/"
echo "Backend URL: https://$DOMAIN_NAME"
echo "Lambda function 'y-image-sharing-expiration-checker' is configured to run every 5 minutes"
