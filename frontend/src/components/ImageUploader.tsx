import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Box, 
  Button, 
  CircularProgress, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Paper, 
  Select, 
  Typography,
  SelectChangeEvent,
  Alert
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { uploadImage } from '../services/api';
import { UploadResponse } from '../types';

interface ImageUploaderProps {
  onUploadSuccess: (response: UploadResponse) => void;
}

const expirationOptions = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '1 day' },
  { value: 4320, label: '3 days' },
  { value: 10080, label: '7 days' },
];

const ImageUploader: React.FC<ImageUploaderProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [expirationMinutes, setExpirationMinutes] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {

    if (preview) {
      URL.revokeObjectURL(preview);
    }
    
    const file = acceptedFiles[0];
    setSelectedFile(file);
    
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);
    

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [preview]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleExpirationChange = (event: SelectChangeEvent<number>) => {
    setExpirationMinutes(event.target.value as number);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image to upload');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await uploadImage(selectedFile, expirationMinutes);
      onUploadSuccess(response);
      

      setSelectedFile(null);
      setPreview(null);
      
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      

      if (err.message && err.message.includes('Network error')) {
        setError('Network error: Please check your connection and try again');
      } else {
        setError('Failed to upload image. Please try again.');
      }
      

    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} className="p-6">
      <Box className="mb-6">
        <Typography variant="h5" component="h2" className="mb-2">
          Upload an Image
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Select an image to share. The link will expire after the selected time.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Box 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-300'
        }`}
      >
        <input {...getInputProps()} />
        
        {preview ? (
          <Box className="flex flex-col items-center">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-h-64 max-w-full mb-4 rounded"
            />
            <Typography variant="body2">
              {selectedFile?.name} ({selectedFile?.size ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0'} MB)
            </Typography>
          </Box>
        ) : (
          <Box className="flex flex-col items-center py-8">
            <CloudUploadIcon className="text-gray-400 mb-2" style={{ fontSize: 48 }} />
            <Typography variant="body1" className="mb-1">
              {isDragActive ? 'Drop the image here' : 'Drag & drop an image here, or click to select'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Maximum file size: 10MB
            </Typography>
          </Box>
        )}
      </Box>

      <FormControl fullWidth variant="outlined" className="mb-4">
        <InputLabel id="expiration-label">Expiration Time</InputLabel>
        <Select
          labelId="expiration-label"
          value={expirationMinutes}
          onChange={handleExpirationChange}
          label="Expiration Time"
        >
          {expirationOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        onClick={handleUpload}
        disabled={!selectedFile || loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {loading ? 'Uploading...' : 'Upload Image'}
      </Button>
    </Paper>
  );
};

export default ImageUploader;
