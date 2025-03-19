import { Request, Response } from 'express';
import S3Service from '../services/S3Service';


export class HealthController {
  private s3Service: any;

  constructor() {
    this.s3Service = S3Service;
  }

 
  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'y-image-sharing-backend',
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
  };

 
  public deepHealthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check S3 connectivity
      const s3Status = await this.s3Service.checkS3Connectivity();
      
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'y-image-sharing-backend',
        dependencies: {
          s3: s3Status ? 'ok' : 'error',
        },
      });
    } catch (error) {
      console.error('Deep health check error:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Deep health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
