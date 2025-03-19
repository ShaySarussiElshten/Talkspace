#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
FRONTEND_BUCKET="y-image-sharing-frontend-${ACCOUNT_ID}"
S3_WEBSITE_URL="http://${FRONTEND_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"

echo "Setting up CloudFront distribution for S3 bucket: ${FRONTEND_BUCKET}"

# Create CloudFront origin access identity for S3
echo "Creating CloudFront origin access identity..."
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config "{\"CallerReference\":\"$(date +%s)\",\"Comment\":\"OAI for ${FRONTEND_BUCKET}\"}" \
  --query "CloudFrontOriginAccessIdentity.Id" \
  --output text)

echo "Created OAI with ID: ${OAI_ID}"
OAI_S3_CANONICAL_ID=$(aws cloudfront get-cloud-front-origin-access-identity \
  --id ${OAI_ID} \
  --query "CloudFrontOriginAccessIdentity.S3CanonicalUserId" \
  --output text)

# Update S3 bucket policy to allow CloudFront OAI access
echo "Updating S3 bucket policy for CloudFront access..."
cat > s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "CanonicalUser": "${OAI_S3_CANONICAL_ID}"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${FRONTEND_BUCKET}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket ${FRONTEND_BUCKET} --policy file://s3-policy.json

# Create CloudFront distribution configuration file
echo "Creating CloudFront distribution configuration..."
cat > cloudfront-config.json << EOF
{
  "CallerReference": "$(date +%s)",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "${FRONTEND_BUCKET}",
        "DomainName": "${FRONTEND_BUCKET}.s3.${AWS_REGION}.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/${OAI_ID}"
        }
      }
    ]
  },
  "DefaultRootObject": "index.html",
  "Comment": "CloudFront distribution for ${FRONTEND_BUCKET}",
  "Enabled": true,
  "DefaultCacheBehavior": {
    "TargetOriginId": "${FRONTEND_BUCKET}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 3,
      "Items": ["GET", "HEAD", "OPTIONS"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "PriceClass": "PriceClass_100"
}
EOF

# Create CloudFront distribution
echo "Creating CloudFront distribution..."
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --query "Distribution.Id" \
  --output text)

echo "CloudFront distribution created with ID: ${DISTRIBUTION_ID}"

# Get the CloudFront domain name
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id ${DISTRIBUTION_ID} \
  --query "Distribution.DomainName" \
  --output text)

echo "CloudFront domain: https://${CLOUDFRONT_DOMAIN}"

# Save CloudFront URL to file
echo "https://${CLOUDFRONT_DOMAIN}" > frontend_cloudfront_url.txt
echo "CloudFront URL saved to deployment/frontend_cloudfront_url.txt"

echo "CloudFront setup completed successfully!"
echo "Frontend CloudFront URL: https://${CLOUDFRONT_DOMAIN}"
echo "Note: It may take up to 15 minutes for the CloudFront distribution to deploy globally."
