import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  DeleteCommand, 
  ScanCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { Image } from '../models/Image';


const isLocalStack = process.env.LOCALSTACK_HOSTNAME;
const endpoint = isLocalStack 
  ? `http://${process.env.LOCALSTACK_HOSTNAME}:4566` 
  : undefined;


const options: any = {
  region: process.env.AWS_REGION || 'eu-west-1',
  endpoint
};

// Only add credentials if they are provided in environment variables
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  options.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  };
}

const client = new DynamoDBClient(options);


const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'y-image-sharing-images';

class DynamoDBService {


  async saveImage(image: Image): Promise<void> {
    try {

      const item = {
        ...image,
        expiresAt: image.expiresAt.getTime() / 1000, // Convert to Unix timestamp for TTL
        createdAt: image.createdAt.toISOString(),
        isExpiredFlag: image.isExpiredFlag || false
      };

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      });

      await docClient.send(command);
      console.log(`Saved image ${image.id} to DynamoDB`);
    } catch (error) {
      console.error('Error saving image to DynamoDB:', error);
      throw error;
    }
  }


  async getImage(imageId: string): Promise<Image | null> {
    try {
      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          id: imageId,
        },
      });

      const response = await docClient.send(command);
      
      if (!response.Item) {
        return null;
      }

      const item = response.Item as any;
      
      item.expiresAt = new Date(item.expiresAt * 1000);
      item.createdAt = new Date(item.createdAt);
      

      const image = new Image({
        id: item.id,
        originalName: item.originalName,
        mimeType: item.mimeType,
        size: item.size,
        path: item.path,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
        url: item.url,
        isExpiredFlag: item.isExpiredFlag || false
      });
      
      return image;
    } catch (error) {
      console.error(`Error getting image ${imageId} from DynamoDB:`, error);
      return null;
    }
  }


  async deleteImage(imageId: string): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          id: imageId,
        },
      });

      await docClient.send(command);
      console.log(`Deleted image ${imageId} from DynamoDB`);
    } catch (error) {
      console.error(`Error deleting image ${imageId} from DynamoDB:`, error);
      throw error;
    }
  }


  async markImageAsExpired(imageId: string): Promise<void> {
    try {
      const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          id: imageId,
        },
        UpdateExpression: 'SET isExpiredFlag = :expired',
        ExpressionAttributeValues: {
          ':expired': true,
        },
      });

      await docClient.send(command);
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
        TableName: TABLE_NAME,
        FilterExpression: 'expiresAt < :now OR isExpiredFlag = :expired',
        ExpressionAttributeValues: {
          ':now': now,
          ':expired': true
        },
      });

      const response = await docClient.send(command);
      
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
      console.error('Error getting expired images from DynamoDB:', error);
      return [];
    }
  }
  

  async getAllImages(): Promise<Image[]> {
    try {

      const command = new ScanCommand({
        TableName: TABLE_NAME,
      });

      const response = await docClient.send(command);
      
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


const dynamoDBService = new DynamoDBService();
export default dynamoDBService;
