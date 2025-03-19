import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import imageRoutes from './routes/imageRoutes';
import ImageService from './services/ImageService';


dotenv.config();


const app = express();
const PORT = process.env.PORT || 8000;


const corsOptions = {
  origin: [
    'http://y-image-sharing-frontend-697508244701.s3-website-eu-west-1.amazonaws.com', 
    'http://localhost:3000', 
    'http://localhost:3001',
    'http://frontend',
    'http://frontend:80',
    'http://api.y-image-sharing-app.com:8000',
    'https://api.y-image-sharing-app.com',
    'https://d13hvexao8k7i5.cloudfront.net'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'ETag'],
  credentials: false, 
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/v1/images', imageRoutes);

// Presigned URL endpoint for frontend
app.post('/presigned-url', async (req, res) => {
  try {
    const { fileName, contentType, expirationMinutes = 60 } = req.body;
    
    if (!fileName || !contentType) {
      res.status(400).json({ error: 'fileName and contentType are required' });
      return;
    }

    const minutes = parseInt(String(expirationMinutes), 10);
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
});


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


const errorHandler = (
  err: Error, 
  req: express.Request, 
  res: express.Response, 
  _next: express.NextFunction
): void => {
  console.error('Unhandled error:', err);
  

  res.status(500).json({ error: 'Internal server error' });
};


app.use(errorHandler);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  // Expiration checking is now handled by a Lambda function
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  // Expiration checking is now handled by a Lambda function
  process.exit(0);
});

export default app;
