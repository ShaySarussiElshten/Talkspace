import { v4 as uuidv4 } from 'uuid';
import S3Service from './S3Service';
import DynamoDBService from './DynamoDBService';
import { Image } from '../models/Image';


class ImageService {
  constructor() {
  }
  

  async generateUploadUrl(fileName: string, contentType: string, expirationMinutes: number): Promise<any> {
    try {
      const imageId = uuidv4();
      const key = `images/${imageId}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + expirationMinutes);
      

      const { uploadUrl, url } = await S3Service.generatePresignedUrl(key, contentType, expirationMinutes);
      

      const image = new Image({
        id: imageId,
        originalName: fileName,
        mimeType: contentType,
        size: 0, 
        path: key,
        expiresAt: expirationTime,
        url: url
      });
      

      await DynamoDBService.saveImage(image);
      
      console.log(`Generated upload URL for ${imageId} with expiration at ${expirationTime.toISOString()}`);
      
      return {
        id: imageId,
        uploadUrl,
        url,
        expiresAt: expirationTime.toISOString(),
        originalName: fileName,
        mimeType: contentType,
        size: 0,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating upload URL:', error);
      throw error;
    }
  }


  async getImageMetadata(imageId: string): Promise<any | null> {
    try {
      const image = await DynamoDBService.getImage(imageId);
      
      if (!image || image.expiresAt < new Date()) {
        return null;
      }
      
      return {
        id: image.id,
        url: image.url,
        originalName: image.originalName,
        mimeType: image.mimeType,
        size: image.size,
        expiresAt: image.expiresAt.toISOString(),
        createdAt: image.createdAt.toISOString()
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      return null;
    }
  }
  

  async getImage(imageId: string): Promise<Buffer | null> {
    try {
   
      const image = await DynamoDBService.getImage(imageId);
      
      if (!image) {
        console.log(`Image ${imageId} not found in database`);
        
         return null;
      }
      

      if (image.expiresAt < new Date()) {
        console.log(`Image ${imageId} has expired`);
        await this.deleteExpiredImage(image);
        return null;
      }
      

      try {
        const data = await S3Service.getFile(image.path);
        if (data) {
          return data;
        }
      } catch (error) {
        console.error('Error getting image from S3:', error);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting image:', error);
      return null;
    }
  }
  
 
  // Expiration checking is now handled by a Lambda function
  
  
  async checkExpiredImages(): Promise<void> {
    try {
      // Get expired images from DynamoDB
      const expiredImages = await DynamoDBService.getExpiredImages();
      
      if (expiredImages.length > 0) {
        console.log(`Found ${expiredImages.length} expired images to delete`);
        
        
        for (const image of expiredImages) {
          // Mark as expired in DynamoDB before deleting
          if (!image.isExpiredFlag) {
            await DynamoDBService.markImageAsExpired(image.id);
          }
          await this.deleteExpiredImage(image);
        }
      }
      
      // Also check for images that are expired by time but not yet marked
      const now = new Date();
      const images = await this.getAllImages();
      for (const image of images) {
        if (!image.isExpiredFlag && image.expiresAt < now) {
          console.log(`Marking image ${image.id} as expired`);
          await DynamoDBService.markImageAsExpired(image.id);
          await this.deleteExpiredImage(image);
        }
      }
    } catch (error) {
      console.error('Error checking for expired images:', error);
    }
  }
  

  private async getAllImages(): Promise<Image[]> {
    try {
      return await DynamoDBService.getAllImages();
    } catch (error) {
      console.error('Error getting all images:', error);
      return [];
    }
  }
  
  
  private async deleteExpiredImage(image: Image): Promise<void> {
    try {
      // If not already marked as expired, mark it
      if (!image.isExpiredFlag) {
        await DynamoDBService.markImageAsExpired(image.id);
      }
      
    
      try {
        await S3Service.deleteFile(image.path);
        console.log(`Deleted S3 file: ${image.path}`);
      } catch (error) {
        console.error(`Error deleting image ${image.id} from S3:`, error);
      }
      
      console.log(`Marked image ${image.id} as expired and removed from storage`);
    } catch (error) {
      console.error(`Error processing expired image ${image.id}:`, error);
    }
  }
  

  async removeExpiredImages(): Promise<void> {
    await this.checkExpiredImages();
  }
}


const imageService = new ImageService();
export default imageService;
