import { useState, useEffect } from 'react';
import { Container, Box, Typography } from '@mui/material';
import ImageUploader from './components/ImageUploader';
import SuccessModal from './components/SuccessModal';
import { UploadResponse } from './types';
import { fixUrl } from './services/api';

function App() {
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [fixedImageUrl, setFixedImageUrl] = useState<string>('');

  const handleUploadSuccess = (response: UploadResponse) => {

    if (response && response.url) {
      const fixed = fixUrl(response.url);
      console.log('Original URL from API:', response.url);
      console.log('Fixed URL for display:', fixed);
      

      const fixedResponse = {
        ...response,
        url: fixed
      };
      
      setUploadResponse(fixedResponse);
      setFixedImageUrl(fixed);
    } else {
      setUploadResponse(response);
    }
    
    setOpenModal(true);
  };

  useEffect(() => {
    if (uploadResponse && uploadResponse.url) {
      const fixed = fixUrl(uploadResponse.url);
      setFixedImageUrl(fixed);
    }
  }, [uploadResponse]);

  const handleCloseModal = () => {
    setOpenModal(false);
    // Reset upload response after modal is closed to ensure clean state for next upload
    setTimeout(() => {
      setUploadResponse(null);
      setFixedImageUrl('');
    }, 300); // Small delay to allow modal animation to complete
  };

  return (
    <Container maxWidth="md">
      <Box className="py-8">
        <Typography variant="h3" component="h1" className="text-center mb-8 font-bold">
          Y Image Sharing
        </Typography>
        <Typography variant="subtitle1" className="text-center mb-8 text-gray-600">
          Upload images and share temporary links with your friends
        </Typography>
        
        <ImageUploader onUploadSuccess={handleUploadSuccess} />
        
        {uploadResponse && (
          <SuccessModal
            open={openModal}
            onClose={handleCloseModal}
            imageUrl={fixedImageUrl}
            expiresAt={new Date(uploadResponse.expiresAt)}
          />
        )}
      </Box>
    </Container>
  );
}

export default App;
