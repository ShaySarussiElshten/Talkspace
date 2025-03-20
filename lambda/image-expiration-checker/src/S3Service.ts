import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.REGION || 'eu-west-1'
    });
    this.bucketName = process.env.S3_BUCKET || '';
  }

  async deleteFile(key: string): Promise<boolean> {
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
}

export default new S3Service();
