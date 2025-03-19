# Deployment Guide for Y Image Sharing Application

This guide provides instructions for deploying the Y Image Sharing application to AWS infrastructure.

## Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. Docker installed for building container images
3. Terraform installed for infrastructure provisioning (optional)

## AWS Credentials Setup

Before deployment, ensure you have AWS credentials with appropriate permissions:

```bash
# Configure AWS CLI
aws configure
```

Required permissions:
- S3 (CreateBucket, PutObject, PutBucketPolicy, etc.)
- ECR (CreateRepository, PutImage, etc.)
- ECS (CreateCluster, CreateService, etc.)
- IAM (PassRole)

## Environment Configuration

1. Create environment files from examples:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Update the environment files with your AWS credentials and configuration:

```
# .env
AWS_REGION=us-east-1
AWS_S3_BUCKET=y-image-sharing-app-YOUR_AWS_ACCOUNT_ID
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
```

## Local Deployment with Docker Compose

For local testing before cloud deployment:

```bash
docker-compose up -d
```

This will start both the frontend and backend services:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## AWS Deployment

### Backend Deployment to ECS Fargate

1. Update the backend task definition:

```bash
cd deployment
# Edit backend-task-definition.json to update AWS account ID and other parameters
```

2. Run the deployment script:

```bash
chmod +x secure-deploy-to-ecs.sh
./secure-deploy-to-ecs.sh
```

This script will:
- Create an ECR repository if it doesn't exist
- Build and push the backend Docker image to ECR
- Register the ECS task definition
- Create an ECS cluster if it doesn't exist
- Create or update the ECS service
- Output the backend API URL

### Frontend Deployment to S3

1. Run the frontend deployment script:

```bash
chmod +x secure-deploy-frontend.sh
./secure-deploy-frontend.sh
```

This script will:
- Build the frontend with the production backend URL
- Create an S3 bucket if it doesn't exist
- Configure the S3 bucket for static website hosting
- Upload the frontend build to S3
- Output the frontend URL

## Terraform Deployment (Alternative)

For a more robust deployment using Infrastructure as Code:

```bash
cd terraform
terraform init
terraform plan -var="aws_region=us-east-1" -var="aws_account_id=YOUR_AWS_ACCOUNT_ID"
terraform apply -var="aws_region=us-east-1" -var="aws_account_id=YOUR_AWS_ACCOUNT_ID"
```

## Verifying Deployment

1. Check the backend health endpoint:
```bash
curl http://BACKEND_URL/health
```

2. Access the frontend URL in a browser to verify the application is working correctly.

## Troubleshooting

### Common Issues

1. **S3 Access Denied**: Ensure your AWS credentials have the necessary S3 permissions.
2. **ECS Service Creation Failure**: Check that your IAM role has the required permissions.
3. **Frontend Cannot Connect to Backend**: Verify CORS settings and that the backend URL is correctly configured.

### Logs

- View ECS logs:
```bash
aws logs get-log-events --log-group-name /ecs/y-image-sharing-backend --log-stream-name STREAM_NAME
```

- View S3 access logs (if enabled):
```bash
aws s3 ls s3://y-image-sharing-app-logs/
```
