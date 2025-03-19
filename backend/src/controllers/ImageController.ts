import { Request, Response } from 'express';
import ImageService from '../services/ImageService';


class ImageController {
 

  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, contentType, expirationMinutes = '60' } = req.body;
      
      if (!fileName || !contentType) {
        res.status(400).json({ error: 'fileName and contentType are required' });
        return;
      }

      const minutes = parseInt(expirationMinutes, 10);
      if (isNaN(minutes) || minutes <= 0) {
        res.status(400).json({ error: 'Invalid expiration time' });
        return;
      }

      // Generate presigned URL and save metadata
      const result = await ImageService.generateUploadUrl(fileName, contentType, minutes);

      res.status(200).json(result);
    } catch (error) {
      console.error('Error generating upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  }


  async getImage(req: Request, res: Response): Promise<void> {
    try {
      const imageId = req.params.imageId;
      
      if (!imageId) {
        res.status(400).json({ error: 'Image ID is required' });
        return;
      }

      console.log(`Retrieving image: ${imageId}`);
      
   
      const imageMetadata = await ImageService.getImageMetadata(imageId);
      
      if (!imageMetadata) {
        res.status(404).json({ error: 'Image not found or expired' });
        return;
      }

      const imageData = await ImageService.getImage(imageId);
      
      if (!imageData) {
        res.status(404).json({ error: 'Image content not found or expired' });
        return;
      }

      // Set the content type and send the image data
      res.setHeader('Content-Type', imageMetadata.mimeType);
      res.status(200).send(imageData);
    } catch (error) {
      console.error('Error retrieving image:', error);
      res.status(500).json({ error: 'Failed to retrieve image' });
    }
  }
}

export default new ImageController();
