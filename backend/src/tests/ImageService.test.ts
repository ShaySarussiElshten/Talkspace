import { Image } from '../models/Image';


jest.mock('../services/DynamoDBService', () => ({
  __esModule: true,
  default: {
    saveImage: jest.fn(),
    getImage: jest.fn(),
    getImageMetadata: jest.fn(),
    deleteImage: jest.fn(),
    getExpiredImages: jest.fn(),
    markImageAsExpired: jest.fn(),
    getAllImages: jest.fn()
  }
}));

jest.mock('../services/S3Service', () => ({
  __esModule: true,
  default: {
    generatePresignedUrl: jest.fn(),
    getFile: jest.fn(),
    deleteFile: jest.fn()
  }
}));


import ImageService from '../services/ImageService';
import DynamoDBService from '../services/DynamoDBService';
import S3Service from '../services/S3Service';

describe('ImageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should be defined', () => {
    expect(ImageService).toBeDefined();
  });

  test('should get image from DynamoDB and S3', async () => {
    // Mock DynamoDBService.getImage
    const mockImage = new Image({
      id: 'image123',
      originalName: 'image.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      path: 'images/image123.jpg',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour in the future
      url: 'https://example.com/image.jpg',
      isExpiredFlag: false
    });
    
    (DynamoDBService.getImage as jest.Mock).mockResolvedValue(mockImage);
    
    // Mock S3Service.getFile
    const mockBuffer = Buffer.from('test image');
    (S3Service.getFile as jest.Mock).mockResolvedValue(mockBuffer);
    
    const result = await ImageService.getImage('image123');
    
    expect(result).toBe(mockBuffer);
    expect(DynamoDBService.getImage).toHaveBeenCalledWith('image123');
    expect(S3Service.getFile).toHaveBeenCalledWith('images/image123.jpg');
  });

  test('should return null for expired images', async () => {
    // Mock DynamoDBService.getImage with expired image
    const mockExpiredImage = new Image({
      id: 'expired123',
      originalName: 'expired.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      path: 'images/expired123.jpg',
      expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
      url: 'https://example.com/expired.jpg',
      isExpiredFlag: false 
    });
    
    (DynamoDBService.getImage as jest.Mock).mockResolvedValue(mockExpiredImage);
  
    (DynamoDBService.markImageAsExpired as jest.Mock).mockResolvedValue(undefined);
    (S3Service.deleteFile as jest.Mock).mockResolvedValue(undefined);
    
    const result = await ImageService.getImage('expired123');
    
    expect(result).toBeNull();
    expect(DynamoDBService.getImage).toHaveBeenCalledWith('expired123');
    expect(DynamoDBService.markImageAsExpired).toHaveBeenCalledWith('expired123');
    expect(DynamoDBService.deleteImage).not.toHaveBeenCalled();
  });

  test('should check and delete expired images from storage but keep metadata', async () => {

    const mockExpiredImages = [
      new Image({
        id: 'expired1',
        originalName: 'expired1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        path: 'images/expired1.jpg',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
        url: 'https://example.com/expired1.jpg',
        isExpiredFlag: false
      }),
      new Image({
        id: 'expired2',
        originalName: 'expired2.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        path: 'images/expired2.jpg',
        expiresAt: new Date(Date.now() - 7200000), // 2 hours in the past
        url: 'https://example.com/expired2.jpg',
        isExpiredFlag: true // Already marked as expired
      })
    ];
    
    (DynamoDBService.getExpiredImages as jest.Mock).mockResolvedValue(mockExpiredImages);
    
    // Mock getAllImages to return empty array (no additional expired images)
    (DynamoDBService.getAllImages as jest.Mock).mockResolvedValue([]);
    
    // Mock deleteExpiredImage dependencies
    (DynamoDBService.markImageAsExpired as jest.Mock).mockResolvedValue(undefined);
    (S3Service.deleteFile as jest.Mock).mockResolvedValue(undefined);
    
    await ImageService.checkExpiredImages();
    
    expect(DynamoDBService.getExpiredImages).toHaveBeenCalled();
    expect(DynamoDBService.markImageAsExpired).toHaveBeenCalledTimes(2); // Called for both images in our implementation
    expect(DynamoDBService.markImageAsExpired).toHaveBeenCalledWith('expired1');
    expect(DynamoDBService.deleteImage).not.toHaveBeenCalled();
    expect(S3Service.deleteFile).toHaveBeenCalledTimes(2);
  });

  test('should handle errors when checking expired images', async () => {

    (DynamoDBService.getExpiredImages as jest.Mock).mockRejectedValue(new Error('Database error'));
    
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await ImageService.checkExpiredImages();
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking for expired images:', expect.any(Error));
    
    consoleErrorSpy.mockRestore();
  });

  test('should get image metadata from DynamoDB', async () => {
  
    const mockImage = new Image({
      id: 'image123',
      originalName: 'image.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      path: 'images/image123.jpg',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour in the future
      url: 'https://example.com/image.jpg',
      isExpiredFlag: false
    });
    
    (DynamoDBService.getImage as jest.Mock).mockResolvedValue(mockImage);
    
    const result = await ImageService.getImageMetadata('image123');
    
    expect(result).toBeTruthy();
    expect(result?.id).toBe('image123');
    expect(result?.originalName).toBe('image.jpg');
    expect(result?.mimeType).toBe('image/jpeg');
    expect(DynamoDBService.getImage).toHaveBeenCalledWith('image123');
  });

  test('should return null for expired image metadata', async () => {
    // Mock DynamoDBService.getImage with expired image
    const mockExpiredImage = new Image({
      id: 'expired123',
      originalName: 'expired.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      path: 'images/expired123.jpg',
      expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
      url: 'https://example.com/expired.jpg',
      isExpiredFlag: false 
    });
    
    (DynamoDBService.getImage as jest.Mock).mockResolvedValue(mockExpiredImage);
    
    (DynamoDBService.markImageAsExpired as jest.Mock).mockResolvedValue(undefined);
    (S3Service.deleteFile as jest.Mock).mockResolvedValue(undefined);
    
    const result = await ImageService.getImageMetadata('expired123');
    
    expect(result).toBeNull();
    expect(DynamoDBService.getImage).toHaveBeenCalledWith('expired123');
  });

  test('should handle image not found in database', async () => {

    (DynamoDBService.getImage as jest.Mock).mockResolvedValue(null);
    const result = await ImageService.getImage('nonexistent');
    
    expect(result).toBeNull();
    expect(DynamoDBService.getImage).toHaveBeenCalledWith('nonexistent');
  });
});
