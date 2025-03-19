#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
FRONTEND_BUCKET_NAME="y-image-sharing-frontend-${ACCOUNT_ID}"

# Create a temporary policy file
cat > /tmp/bucket-policy.json << EOL
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${FRONTEND_BUCKET_NAME}/*"
    }
  ]
}
EOL

# Apply the policy to the bucket
aws s3api put-bucket-policy --bucket ${FRONTEND_BUCKET_NAME} --policy file:///tmp/bucket-policy.json

# Set the bucket ACL to public-read
aws s3api put-bucket-acl --bucket ${FRONTEND_BUCKET_NAME} --acl public-read

echo "S3 bucket policy updated successfully!"
