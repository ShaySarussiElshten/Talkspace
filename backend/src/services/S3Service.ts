import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


class S3Service {
  private s3Client: S3Client | null = null;
  private bucketName: string = '';
  constructor() {
    try {
      const options: any = {
        region: process.env.AWS_REGION || 'eu-west-1'
      };
      
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        options.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        };
      }
      
      this.s3Client = new S3Client(options);
      this.bucketName = process.env.AWS_S3_BUCKET || 'y-image-sharing-app-697508244701';
      console.log(`S3Service initialized with bucket: ${this.bucketName} in region ${options.region}`);
    } catch (error) {
      console.error('Failed to initialize S3 client:', error);
      throw error; 
    }
  }


  async generatePresignedUrl(key: string, contentType: string, expirationMinutes: number): Promise<{ uploadUrl: string; url: string }> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const expirationSeconds = expirationMinutes * 60;

 
      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType
      });
      
      const uploadUrl = await getSignedUrl(this.s3Client, putCommand, {
        expiresIn: expirationSeconds
      });

      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      const url = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: expirationSeconds
      });

      return { uploadUrl, url };
    } catch (error) {
      console.error('Error generating presigned URLs:', error);
      throw error;
    }
  }


  async getFile(key: string): Promise<Buffer | null> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      const response = await this.s3Client.send(command);
      if (!response.Body) {
        return null;
      }
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error getting file from S3:', error);
      return null;
    }
  }

 
  async deleteFile(key: string): Promise<boolean> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return false;
    }
  }

 
  async getSignedUrl(key: string, expirationSeconds: number): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      return await getSignedUrl(this.s3Client, command, { expiresIn: expirationSeconds });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

}

export default new S3Service();
