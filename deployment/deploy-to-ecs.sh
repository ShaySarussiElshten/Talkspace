#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="y-image-sharing-backend"
ECS_CLUSTER="y-image-sharing-cluster"
ECS_SERVICE="y-image-sharing-backend-service"
TASK_DEFINITION_FAMILY="y-image-sharing-backend"

# Create ECR repository if it doesn't exist
echo "Creating ECR repository if it doesn't exist..."
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} || aws ecr create-repository --repository-name ${ECR_REPOSITORY}

# Build and push Docker image to ECR
echo "Building and pushing Docker image to ECR..."
cd ../backend
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
docker build -t ${ECR_REPOSITORY}:latest .
docker tag ${ECR_REPOSITORY}:latest ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest

# Register task definition
echo "Registering ECS task definition..."
aws ecs register-task-definition --cli-input-json file://../deployment/backend-task-definition.json

# Create ECS cluster if it doesn't exist
echo "Creating ECS cluster if it doesn't exist..."
aws ecs describe-clusters --clusters ${ECS_CLUSTER} || aws ecs create-cluster --cluster-name ${ECS_CLUSTER}

# Get default VPC subnets and security groups
echo "Getting default VPC subnets and security groups..."
DEFAULT_VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${DEFAULT_VPC_ID}" --query "Subnets[0:2].SubnetId" --output text | tr '\t' ',')
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=${DEFAULT_VPC_ID}" "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text)

# Update security group to allow inbound traffic on port 8000
echo "Updating security group to allow inbound traffic on port 8000..."
aws ec2 authorize-security-group-ingress --group-id ${SECURITY_GROUP_ID} --protocol tcp --port 8000 --cidr 0.0.0.0/0 || echo "Inbound rule already exists"

# Create or update ECS service
echo "Creating or updating ECS service..."
LATEST_TASK_DEFINITION=$(aws ecs describe-task-definition --task-definition ${TASK_DEFINITION_FAMILY} --query 'taskDefinition.taskDefinitionArn' --output text)
   
# Check if service exists
if aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --query 'services[0].status' --output text 2>/dev/null; then
  # Update existing service
  echo "Updating existing ECS service..."
  aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --task-definition ${LATEST_TASK_DEFINITION} --force-new-deployment
else
  # Create new service
  echo "Creating new ECS service..."
  aws ecs create-service \
    --cluster ${ECS_CLUSTER} \
    --service-name ${ECS_SERVICE} \
    --task-definition ${LATEST_TASK_DEFINITION} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SECURITY_GROUP_ID}],assignPublicIp=ENABLED}"
fi

# Wait for service to stabilize
echo "Waiting for service to stabilize..."
aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE}

# Get the public IP of the task
echo "Getting the public IP of the task..."
TASK_ARN=$(aws ecs list-tasks --cluster ${ECS_CLUSTER} --service-name ${ECS_SERVICE} --query 'taskArns[0]' --output text)
NETWORK_INTERFACE=$(aws ecs describe-tasks --cluster ${ECS_CLUSTER} --tasks ${TASK_ARN} --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids ${NETWORK_INTERFACE} --query 'NetworkInterfaces[0].Association.PublicIp' --output text)

echo "Backend deployment to ECS Fargate completed successfully!"
echo "Backend API URL: http://${PUBLIC_IP}:8000"

# Store the backend URL for frontend deployment
echo ${PUBLIC_IP} > ../deployment/backend_public_ip.txt
