import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  ScanCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { Image } from './Image';

class DynamoDBService {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.REGION || 'eu-west-1'
    });
    this.docClient = DynamoDBDocumentClient.from(this.client);
    this.tableName = process.env.DYNAMODB_TABLE || 'y-image-sharing-images';
  }

  async markImageAsExpired(imageId: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          id: imageId,
        },
        UpdateExpression: 'SET isExpiredFlag = :expired',
        ExpressionAttributeValues: {
          ':expired': true,
        },
      });

      await this.docClient.send(command);
      console.log(`Marked image ${imageId} as expired in DynamoDB`);
    } catch (error) {
      console.error(`Error marking image ${imageId} as expired in DynamoDB:`, error);
      throw error;
    }
  }

  async getExpiredImages(): Promise<Image[]> {
    try {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'expiresAt < :now OR isExpiredFlag = :expired',
        ExpressionAttributeValues: {
          ':now': now,
          ':expired': true
        },
      });

      const response = await this.docClient.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      // Convert items to Image objects
      return response.Items.map((item: any) => {
        return new Image({
          id: item.id,
          originalName: item.originalName,
          mimeType: item.mimeType,
          size: item.size,
          path: item.path,
          expiresAt: new Date(item.expiresAt * 1000),
          createdAt: new Date(item.createdAt),
          url: item.url,
          isExpiredFlag: item.isExpiredFlag || false
        });
      });
    } catch (error) {
      console.error('Error getting expired images from DynamoDB:', error);
      return [];
    }
  }
  
  async getAllImages(): Promise<Image[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        ConsistentRead: true, // Ensure we get the latest data
      });

      const response = await this.docClient.send(command);
      
      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map((item: any) => {
        return new Image({
          id: item.id,
          originalName: item.originalName,
          mimeType: item.mimeType,
          size: item.size,
          path: item.path,
          expiresAt: new Date(item.expiresAt * 1000),
          createdAt: new Date(item.createdAt),
          url: item.url,
          isExpiredFlag: item.isExpiredFlag || false
        });
      });
    } catch (error) {
      console.error('Error getting all images from DynamoDB:', error);
      return [];
    }
  }
}

export default new DynamoDBService();
