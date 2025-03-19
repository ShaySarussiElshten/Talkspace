# Lambda function for checking expired images
resource "aws_lambda_function" "image_expiration_checker" {
  function_name    = "y-image-sharing-expiration-checker"
  filename         = "../lambda/image-expiration-checker/function.zip"
  source_code_hash = filebase64sha256("../lambda/image-expiration-checker/function.zip")
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  timeout          = 60
  memory_size      = 256
  role             = aws_iam_role.lambda_execution_role.arn
  
  environment {
    variables = {
      REGION    = var.aws_region
      S3_BUCKET = aws_s3_bucket.image_bucket.id
      TABLE_NAME = aws_dynamodb_table.images_table.name
    }
  }
}

# IAM role for Lambda execution
resource "aws_iam_role" "lambda_execution_role" {
  name = "y-image-sharing-lambda-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for Lambda to access S3 and DynamoDB
resource "aws_iam_policy" "lambda_execution_policy" {
  name        = "y-image-sharing-lambda-execution-policy"
  description = "Allow Lambda to access S3 and DynamoDB"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = [
          aws_s3_bucket.image_bucket.arn,
          "${aws_s3_bucket.image_bucket.arn}/*"
        ]
      },
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Effect   = "Allow"
        Resource = [
          aws_dynamodb_table.images_table.arn
        ]
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Attach the policy to the Lambda execution role
resource "aws_iam_role_policy_attachment" "lambda_execution_policy_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_execution_policy.arn
}

# CloudWatch Event Rule to trigger Lambda every 5 minutes
resource "aws_cloudwatch_event_rule" "image_expiration_checker_rule" {
  name                = "y-image-sharing-expiration-checker-rule"
  description         = "Trigger image expiration checker Lambda function"
  schedule_expression = "rate(5 minutes)"
}

# CloudWatch Event Target to connect the rule to the Lambda function
resource "aws_cloudwatch_event_target" "image_expiration_checker_target" {
  rule      = aws_cloudwatch_event_rule.image_expiration_checker_rule.name
  target_id = "y-image-sharing-expiration-checker-target"
  arn       = aws_lambda_function.image_expiration_checker.arn
}

# Permission for CloudWatch Events to invoke the Lambda function
resource "aws_lambda_permission" "allow_cloudwatch_to_call_lambda" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_expiration_checker.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.image_expiration_checker_rule.arn
}
