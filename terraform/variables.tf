variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "eu-west-1"
}

variable "image_bucket_name" {
  description = "Name of the S3 bucket for image storage"
  type        = string
  default     = "y-image-sharing-app-697508244701"
}

variable "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend hosting"
  type        = string
  default     = "y-image-sharing-frontend-697508244701"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "production"
}
