resource "aws_dynamodb_table" "images_table" {
  name           = "y-image-sharing-images"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
  
  tags = {
    Name        = "y-image-sharing-images"
    Environment = var.environment
  }
}
