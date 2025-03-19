import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box, 
  TextField, 
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { fixUrl } from '../services/api';


const countdownStyle = {
  color: '#e74c3c',
  fontWeight: 'bold'
};

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  expiresAt: Date;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ 
  open, 
  onClose, 
  imageUrl, 
  expiresAt 
}) => {
  const [copied, setCopied] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [displayUrl, setDisplayUrl] = useState('');
  const [countdown, setCountdown] = useState<string>('');


  useEffect(() => {
    if (!imageUrl) return;
    
    console.log('SuccessModal received URL:', imageUrl);
    
    const fixed = fixUrl(imageUrl);
    console.log('SuccessModal fixed URL:', fixed);
    setDisplayUrl(fixed);
    
    const imgElement = document.querySelector('.success-modal-image') as HTMLImageElement;
    if (imgElement) {
      imgElement.src = fixed;
      console.log('Updated image element src to:', fixed);
    }
    

    return () => {
      setDisplayUrl('');
    };
  }, [imageUrl]);


  useEffect(() => {

    const updateCountdown = () => {
      const now = new Date();
      const timeRemaining = expiresAt.getTime() - now.getTime();
      
      if (timeRemaining <= 0) {
        setCountdown('Expired');
        return;
      }
      
      const minutes = Math.floor(timeRemaining / (60 * 1000));
      const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
      
      setCountdown(`${minutes}m ${seconds}s`);
    };
    

    updateCountdown();
    

    const intervalId = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(intervalId);
  }, [expiresAt]);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(displayUrl)
      .then(() => {
        setCopied(true);
        setSnackbarOpen(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <CheckCircleIcon color="success" className="mr-2" />
            <Typography variant="h6">Image Uploaded Successfully!</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" className="mb-4">
            Your image has been uploaded and is ready to share. The link will expire in <strong style={countdownStyle}>{countdown}</strong>.
          </Typography>
          
          <Typography variant="subtitle2" className="mb-1">
            Share this link with your friends:
          </Typography>
          
          <Box display="flex" className="mb-4">
            <TextField
              fullWidth
              variant="outlined"
              value={displayUrl}
              InputProps={{
                readOnly: true,
              }}
              size="small"
            />
            <IconButton 
              color={copied ? "success" : "primary"} 
              onClick={handleCopyClick}
              className="ml-2"
            >
              <ContentCopyIcon />
            </IconButton>
          </Box>
          
          <Box className="mt-4">
            <img 
              src={displayUrl} 
              alt="Uploaded" 
              className="max-w-full max-h-64 mx-auto rounded success-modal-image"
              onError={(e) => {
                console.error('Image failed to load:', displayUrl);
                const imgElement = e.target as HTMLImageElement;
                imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJmZWF0aGVyIGZlYXRoZXItaW1hZ2UiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiPjwvY2lyY2xlPjxwb2x5bGluZSBwb2ludHM9IjIxIDE1IDE2IDEwIDUgMjEiPjwvcG9seWxpbmU+PC9zdmc+';
                imgElement.alt = 'Image failed to load';
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={2000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success">
          Link copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};

export default SuccessModal;
