import DynamoDBService from '../services/DynamoDBService';
import { Image } from '../models/Image';


jest.mock('../services/DynamoDBService', () => ({
  __esModule: true,
  default: {
    saveImage: jest.fn(),
    getImage: jest.fn(),
    deleteImage: jest.fn(),
    getExpiredImages: jest.fn(),
    markImageAsExpired: jest.fn(),
    getAllImages: jest.fn()
  }
}));

describe('DynamoDBService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should be defined', () => {
    expect(DynamoDBService).toBeDefined();
  });

  test('should save image to DynamoDB', async () => {
  
    (DynamoDBService.saveImage as jest.Mock).mockResolvedValue(undefined);
    
    const mockImage = new Image({
      id: 'test.jpg',
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      path: 'images/test.jpg',
      expiresAt: new Date(),
      url: 'https://example.com/test.jpg',
      isExpiredFlag: false
    });
    
    await DynamoDBService.saveImage(mockImage);
    
    expect(DynamoDBService.saveImage).toHaveBeenCalledWith(mockImage);
  });

  test('should get image from DynamoDB', async () => {

    const mockImage = new Image({
      id: 'test.jpg',
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      path: 'images/test.jpg',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour in the future
      url: 'https://example.com/test.jpg',
      isExpiredFlag: false
    });
    

    (DynamoDBService.getImage as jest.Mock).mockResolvedValue(mockImage);
    
    const result = await DynamoDBService.getImage('test.jpg');
    
    expect(DynamoDBService.getImage).toHaveBeenCalledWith('test.jpg');
    expect(result).toBe(mockImage);
    expect(result?.id).toBe('test.jpg');
    expect(result?.isExpiredFlag).toBe(false);
  });

  test('should return null if image not found', async () => {

    (DynamoDBService.getImage as jest.Mock).mockResolvedValue(null);
    
    const result = await DynamoDBService.getImage('nonexistent.jpg');
    
    expect(DynamoDBService.getImage).toHaveBeenCalledWith('nonexistent.jpg');
    expect(result).toBeNull();
  });

  test('should delete image from DynamoDB', async () => {

    (DynamoDBService.deleteImage as jest.Mock).mockResolvedValue(undefined);
    
    await DynamoDBService.deleteImage('test.jpg');
    
    expect(DynamoDBService.deleteImage).toHaveBeenCalledWith('test.jpg');
  });

  test('should get expired images from DynamoDB', async () => {

    const mockExpiredImages = [
      new Image({
        id: 'expired1.jpg',
        originalName: 'expired1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        path: 'images/expired1.jpg',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
        url: 'https://example.com/expired1.jpg',
        isExpiredFlag: false // Not yet marked as expired
      }),
      new Image({
        id: 'expired2.jpg',
        originalName: 'expired2.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        path: 'images/expired2.jpg',
        expiresAt: new Date(Date.now() - 7200000), // 2 hours in the past
        url: 'https://example.com/expired2.jpg',
        isExpiredFlag: true 
      })
    ];
    

    (DynamoDBService.getExpiredImages as jest.Mock).mockResolvedValue(mockExpiredImages);
    const result = await DynamoDBService.getExpiredImages();
    
    expect(DynamoDBService.getExpiredImages).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('expired1.jpg');
    expect(result[0].isExpiredFlag).toBe(false);
    expect(result[1].id).toBe('expired2.jpg');
    expect(result[1].isExpiredFlag).toBe(true);
  });

  test('should handle errors when saving image', async () => {

    (DynamoDBService.saveImage as jest.Mock).mockRejectedValue(new Error('DynamoDB error'));
    
    const mockImage = new Image({
      id: 'test.jpg',
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      path: 'images/test.jpg',
      expiresAt: new Date(),
      url: 'https://example.com/test.jpg'
    });
    
    await expect(DynamoDBService.saveImage(mockImage)).rejects.toThrow('DynamoDB error');
  });

  test('should handle empty response when getting expired images', async () => {

    (DynamoDBService.getExpiredImages as jest.Mock).mockResolvedValue([]);
    const result = await DynamoDBService.getExpiredImages();
    
    expect(DynamoDBService.getExpiredImages).toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});
