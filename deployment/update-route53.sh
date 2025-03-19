#!/bin/bash
set -e

# Configuration
HOSTED_ZONE_ID="Z03075662Q3DOLRQZJ5HP"
DOMAIN_NAME="api.y-image-sharing-app.com"
REGION="eu-west-1"

# Get the current backend IP
BACKEND_IP=$(aws ec2 describe-network-interfaces \
  --filters "Name=description,Values=*y-image-sharing-backend*" \
  --query "NetworkInterfaces[0].Association.PublicIp" \
  --output text \
  --region $REGION)

if [ -z "$BACKEND_IP" ] || [ "$BACKEND_IP" == "None" ]; then
  echo "Error: Could not find backend IP, trying to get ALB DNS name instead"
  BACKEND_ALB=$(aws elbv2 describe-load-balancers --names y-image-sharing-alb --query "LoadBalancers[0].DNSName" --output text --region $REGION)
  if [ -z "$BACKEND_ALB" ] || [ "$BACKEND_ALB" == "None" ]; then
    echo "Error: Could not find ALB DNS name either, using fallback IP"
    BACKEND_IP="34.243.11.255"
  else
    echo "Using ALB DNS name: $BACKEND_ALB"
    # Create a CNAME record instead of A record
    aws route53 change-resource-record-sets \
      --hosted-zone-id $HOSTED_ZONE_ID \
      --change-batch '{
        "Changes": [
          {
            "Action": "UPSERT",
            "ResourceRecordSet": {
              "Name": "'$DOMAIN_NAME'",
              "Type": "CNAME",
              "TTL": 300,
              "ResourceRecords": [
                {
                  "Value": "'$BACKEND_ALB'"
                }
              ]
            }
          }
        ]
      }' \
      --region $REGION
    echo "Route 53 CNAME record updated successfully"
    echo "Backend URL: http://$DOMAIN_NAME:8000"
    exit 0
  fi
fi

echo "Updating Route 53 record for $DOMAIN_NAME to point to $BACKEND_IP"

# Update the Route 53 record
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "'$DOMAIN_NAME'",
          "Type": "A",
          "TTL": 300,
          "ResourceRecords": [
            {
              "Value": "'$BACKEND_IP'"
            }
          ]
        }
      }
    ]
  }' \
  --region $REGION

echo "Route 53 record updated successfully"
echo "Backend URL: http://$DOMAIN_NAME:8000"
