output "image_bucket_name" {
  description = "Name of the S3 bucket for image storage"
  value       = aws_s3_bucket.image_bucket.id
}

output "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend hosting"
  value       = aws_s3_bucket.frontend_bucket.id
}

output "frontend_website_endpoint" {
  description = "S3 website endpoint for frontend"
  value       = aws_s3_bucket_website_configuration.frontend_website.website_endpoint
}

output "cloudfront_domain_name" {
  description = "CloudFront domain name for frontend"
  value       = aws_cloudfront_distribution.frontend_distribution.domain_name
}

output "backend_alb_dns_name" {
  description = "ALB DNS name for backend API"
  value       = aws_lb.backend.dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for backend Docker image"
  value       = aws_ecr_repository.backend_repo.repository_url
}
