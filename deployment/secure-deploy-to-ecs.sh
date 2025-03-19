#!/bin/bash
set -e

# Configuration
AWS_REGION="eu-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="y-image-sharing-backend"
ECS_CLUSTER="y-image-sharing-cluster"
ECS_SERVICE="y-image-sharing-backend-service"
TASK_DEFINITION_FAMILY="y-image-sharing-backend"
S3_BUCKET="y-image-sharing-app-${ACCOUNT_ID}"

echo "Starting secure deployment to ECS Fargate..."

# Create ECR repository if it doesn't exist
echo "Creating ECR repository if it doesn't exist..."
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY} || aws ecr create-repository --repository-name ${ECR_REPOSITORY}

# Build and push Docker image to ECR
echo "Building and pushing Docker image to ECR..."
cd /home/ubuntu/repos/task-e/backend
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
docker build -t ${ECR_REPOSITORY}:latest .
docker tag ${ECR_REPOSITORY}:latest ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest
cd ..

# Update task definition with correct account ID
echo "Updating task definition with account ID..."
sed -i "s/YOUR_AWS_ACCOUNT_ID/${ACCOUNT_ID}/g" ./deployment/backend-task-definition.json

# Register task definition
echo "Registering ECS task definition..."
aws ecs register-task-definition --cli-input-json file://./deployment/backend-task-definition.json

# Create ECS cluster if it doesn't exist
echo "Creating ECS cluster if it doesn't exist..."
aws ecs describe-clusters --clusters ${ECS_CLUSTER}
if [ $? -ne 0 ]; then
  echo "Creating new ECS cluster..."
  aws ecs create-cluster --cluster-name ${ECS_CLUSTER}
  if [ $? -ne 0 ]; then
    echo "Failed to create ECS cluster. Exiting."
    exit 1
  fi
fi

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
SERVICE_STATUS="MISSING"

if [ "$SERVICE_STATUS" != "MISSING" ]; then
  # Update existing service
  echo "Updating existing ECS service..."
  aws ecs update-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --task-definition ${LATEST_TASK_DEFINITION} --force-new-deployment
else
  # Create new service
  echo "Checking existing service status..."
  SERVICE_INFO=$(aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} 2>/dev/null || echo '{"services": []}')
  ACTIVE_COUNT=$(echo "$SERVICE_INFO" | jq -r '.services | length')
  
  if [ "$ACTIVE_COUNT" != "0" ]; then
    echo "Deleting existing service..."
    aws ecs delete-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --force || true
    
    echo "Waiting for service deletion (up to 10 minutes)..."
    for i in {1..60}; do
      # Check service status and deployment state
      SERVICE_INFO=$(aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} 2>/dev/null || echo '{"services": []}')
      ACTIVE_COUNT=$(echo "$SERVICE_INFO" | jq -r '.services | length')
      
      if [ "$ACTIVE_COUNT" = "0" ]; then
        echo "Service deleted successfully"
        break
      fi
      
      # Check deployment status
      DEPLOYMENT_STATUS=$(echo "$SERVICE_INFO" | jq -r '.services[0].deployments[0].rolloutState // "UNKNOWN"')
      RUNNING_COUNT=$(echo "$SERVICE_INFO" | jq -r '.services[0].runningCount // 0')
      PENDING_COUNT=$(echo "$SERVICE_INFO" | jq -r '.services[0].pendingCount // 0')
      
      if [ "$RUNNING_COUNT" = "0" ] && [ "$PENDING_COUNT" = "0" ] && [ "$DEPLOYMENT_STATUS" != "IN_PROGRESS" ]; then
        echo "Service is fully drained"
        break
      fi
      
      echo "Waiting for service deletion... attempt $i/60 (running: $RUNNING_COUNT, pending: $PENDING_COUNT, deployment: $DEPLOYMENT_STATUS)"
      sleep 10
    done
    
    # Additional wait after service deletion
    echo "Waiting 60 seconds for AWS to fully process the deletion..."
    sleep 60
    
    # Final cleanup - force delete any remaining tasks
    echo "Performing final task cleanup..."
    TASKS=$(aws ecs list-tasks --cluster ${ECS_CLUSTER} --family ${TASK_DEFINITION_FAMILY} --desired-status RUNNING --query 'taskArns[]' --output text)
    if [ ! -z "$TASKS" ]; then
      for TASK in $TASKS; do
        aws ecs stop-task --cluster ${ECS_CLUSTER} --task $TASK --reason "Final cleanup during redeployment"
      done
      echo "Waiting 30 seconds for tasks to stop..."
      sleep 30
    fi
    
    # Delete and recreate the service to ensure clean state
    aws ecs delete-service --cluster ${ECS_CLUSTER} --service ${ECS_SERVICE} --force || true
    sleep 30
    
    # Additional cleanup for any stuck tasks
    TASKS=$(aws ecs list-tasks --cluster ${ECS_CLUSTER} --service-name ${ECS_SERVICE} --query 'taskArns[]' --output text)
    if [ ! -z "$TASKS" ]; then
      echo "Force stopping remaining tasks..."
      for TASK in $TASKS; do
        aws ecs stop-task --cluster ${ECS_CLUSTER} --task $TASK --reason "Cleanup during redeployment"
      done
    fi
    
    # Wait a bit after cleanup
    sleep 30
  fi
  
  echo "Creating new ECS service..."
  aws ecs create-service \
    --cluster ${ECS_CLUSTER} \
    --service-name ${ECS_SERVICE} \
    --task-definition ${LATEST_TASK_DEFINITION} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SECURITY_GROUP_ID}],assignPublicIp=ENABLED}" \
    --platform-version LATEST
    
  echo "Waiting for service to stabilize (up to 5 minutes)..."
  timeout 300 aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE}
  WAIT_STATUS=$?
  
  echo "Checking service health..."
  SERVICE_INFO=$(aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE})
  RUNNING_COUNT=$(echo "$SERVICE_INFO" | jq -r '.services[0].runningCount')
  DEPLOYMENT_STATUS=$(echo "$SERVICE_INFO" | jq -r '.services[0].deployments[0].rolloutState')
  EVENTS=$(echo "$SERVICE_INFO" | jq -r '.services[0].events[0].message')
  
  if [ "$WAIT_STATUS" != "0" ] || [ "$RUNNING_COUNT" = "0" ]; then
    echo "Service failed to stabilize within timeout."
    echo "Deployment Status: $DEPLOYMENT_STATUS"
    echo "Latest Event: $EVENTS"
    echo "Checking CloudWatch logs for errors..."
    aws logs get-log-events \
      --log-group-name "/ecs/y-image-sharing-backend" \
      --log-stream-name $(aws logs describe-log-streams \
        --log-group-name "/ecs/y-image-sharing-backend" \
        --order-by LastEventTime \
        --descending \
        --limit 1 \
        --query 'logStreams[0].logStreamName' \
        --output text) \
      --limit 10
    exit 1
  fi
  
  echo "Service deployed successfully with $RUNNING_COUNT running tasks"
  echo "Deployment Status: $DEPLOYMENT_STATUS"
  echo "Latest Event: $EVENTS"
    --cluster ${ECS_CLUSTER} \
    --service-name ${ECS_SERVICE} \
    --task-definition ${LATEST_TASK_DEFINITION} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SECURITY_GROUP_ID}],assignPublicIp=ENABLED}" \
    --platform-version LATEST
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

# Update Route 53 DNS record
echo "Updating Route 53 DNS record..."
../deployment/update-route53.sh
