#!/bin/bash
set -e

# Configuration
REGION="eu-west-1"
FUNCTION_NAME="y-image-sharing-expiration-checker"
ROLE_ARN="arn:aws:iam::697508244701:role/y-image-sharing-lambda-execution-role"
HANDLER="index.handler"
RUNTIME="nodejs18.x"
TIMEOUT=60
MEMORY_SIZE=256
S3_BUCKET="y-image-sharing-app-697508244701"
DYNAMODB_TABLE="y-image-sharing-images"

echo "Deploying Lambda function for image expiration checking..."

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &> /dev/null; then
  echo "Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION
else
  echo "Creating new Lambda function..."
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime $RUNTIME \
    --role $ROLE_ARN \
    --handler $HANDLER \
    --timeout $TIMEOUT \
    --memory-size $MEMORY_SIZE \
    --zip-file fileb://function.zip \
    --environment "Variables={REGION=$REGION,S3_BUCKET=$S3_BUCKET,TABLE_NAME=$DYNAMODB_TABLE}" \
    --region $REGION
fi

# Create or update CloudWatch Events rule to trigger Lambda every 5 minutes
RULE_NAME="y-image-sharing-expiration-checker-rule"

echo "Setting up CloudWatch Events rule to trigger Lambda every 5 minutes..."
aws events put-rule \
  --name $RULE_NAME \
  --schedule-expression "rate(5 minutes)" \
  --state ENABLED \
  --region $REGION

# Add permission for CloudWatch Events to invoke Lambda
echo "Adding permission for CloudWatch Events to invoke Lambda..."
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id "AllowExecutionFromCloudWatch" \
  --action "lambda:InvokeFunction" \
  --principal "events.amazonaws.com" \
  --source-arn $(aws events describe-rule --name $RULE_NAME --region $REGION --query 'Arn' --output text) \
  --region $REGION || true

# Set CloudWatch Events rule target to Lambda function
echo "Setting CloudWatch Events rule target to Lambda function..."
aws events put-targets \
  --rule $RULE_NAME \
  --targets "Id"="1","Arn"="$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)" \
  --region $REGION

echo "Lambda function deployment completed successfully!"
