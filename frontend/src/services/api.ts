import axios from 'axios';
import { UploadResponse } from '../types';

// Get API URL from environment variable or use default
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://backend:8000';

// Get the base URL for image links (use the current window location in browser)
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // In browser environment, use the current window location
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // If we're on localhost, use port 8000, otherwise use the current port
    // or no port if it's the default port for the protocol
    let port = '';
    if (hostname === 'localhost') {
      port = ':8000';
    } else if (window.location.port && window.location.port !== '80' && window.location.port !== '443') {
      port = `:${window.location.port}`;
    }
    
    return `${protocol}//${hostname}${port}`;
  }
  // Fallback to API_URL
  return API_URL;
};

// Function to fix URLs to match the current protocol (http/https)
export const fixUrl = (url: string): string => {
  if (!url) return url;
  
  // If URL is already a presigned S3 URL (contains Signature and Expires params), return it as is
  if (url.includes('Signature=') && url.includes('Expires=')) {
    console.log('URL is already a presigned S3 URL with expiration:', url);
    return url;
  }
  
  // If URL is already a CloudFront URL, return it as is
  if (url.includes('cloudfront.net')) {
    console.log('URL is already a CloudFront URL:', url);
    return url;
  }
  
  // If URL is an S3 URL, convert it to CloudFront URL
  if (url.includes('s3.amazonaws.com') || url.includes('s3.eu-west-1.amazonaws.com')) {
    const CLOUDFRONT_DOMAIN = (import.meta as any).env?.VITE_CLOUDFRONT_DOMAIN || 'd13hvexao8k7i5.cloudfront.net';
    // Handle both region-specific and region-agnostic S3 URLs
    const key = url.includes('s3.eu-west-1.amazonaws.com') 
      ? url.split('s3.eu-west-1.amazonaws.com/').pop() 
      : url.split('/').slice(4).join('/');
    const cloudFrontUrl = `https://${CLOUDFRONT_DOMAIN}/${key}`;
    console.log('Converted S3 URL to CloudFront URL:', cloudFrontUrl);
    return cloudFrontUrl;
  }
  
  // Get the current base URL for replacement
  const baseUrl = getBaseUrl();
  console.log('Base URL for replacement:', baseUrl);
  console.log('Original URL to fix:', url);
  
  // Create a URL object to get the hostname and path
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (e) {
    // If it's not a valid URL, it might be a relative path
    if (url.startsWith('/')) {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || '';
      console.log('Converting relative URL to absolute:', `${apiUrl}${url}`);
      return `${apiUrl}${url}`;
    }
    console.error('Invalid URL:', url);
    return url;
  }
  
  // If the URL is a localhost URL, replace it with the current base URL
  if (urlObj.hostname === 'localhost') {
    // Extract the path and query string
    const pathWithQuery = urlObj.pathname + urlObj.search;
    const fixedUrl = `${baseUrl}${pathWithQuery}`;
    console.log('Fixed URL after localhost replacement:', fixedUrl);
    return fixedUrl;
  }
  
  // If we're on HTTPS but the URL is HTTP, upgrade it to HTTPS
  if (typeof window !== 'undefined' && 
      window.location.protocol === 'https:' && 
      url.startsWith('http:')) {
    const fixedUrl = url.replace('http:', 'https:');
    console.log('Fixed URL after protocol upgrade:', fixedUrl);
    return fixedUrl;
  }
  
  return url;
};

// Get API URL for the current environment
export const getApiUrl = (): string => {
  // Use environment variable or fallback for local development
  return API_URL || 'http://localhost:8000';
};

// Use the API_URL from environment variables
const apiUrl = API_URL;
console.log('Using API URL:', apiUrl);
console.log('Current window location:', typeof window !== 'undefined' ? window.location.href : 'Not in browser');

/**
 * Upload an image to the server using presigned URL flow
 */
export async function uploadImage(
  file: File, 
  expirationMinutes: number
): Promise<UploadResponse> {
  try {
    // Use API_URL from environment variables
    const presignedUrlEndpoint = `${apiUrl}/presigned-url`;
    console.log(`Requesting presigned URL from: ${presignedUrlEndpoint}`);
    
    // Request presigned URL with file metadata
    const presignedUrlResponse = await axios.post(
      presignedUrlEndpoint,
      {
        fileName: file.name,
        contentType: file.type,
        expirationMinutes: expirationMinutes
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging requests
        timeout: 10000
      }
    );
    
    // Extract the presigned URL and metadata from the response
    const { uploadUrl, id, url, expiresAt, originalName, mimeType, createdAt } = presignedUrlResponse.data;
    
    if (!uploadUrl) {
      throw new Error('Failed to get presigned URL for upload');
    }
    
    console.log(`Got presigned URL: ${uploadUrl}`);
    console.log(`Will upload to S3 URL: ${url}`);
    
    // Upload the file directly to S3 using the presigned URL
    await axios.put(
      uploadUrl,
      file,
      {
        headers: {
          'Content-Type': file.type
        },
        // Add timeout to prevent hanging requests
        timeout: 30000
      }
    );
    
    console.log('File uploaded successfully to S3');
    
    // Return the response with fixed URL
    const fixedUrl = fixUrl(url);
    console.log('Final image URL:', fixedUrl);
    
    return {
      id,
      url: fixedUrl,
      expiresAt,
      originalName,
      mimeType,
      size: file.size,
      createdAt
    };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    
    // More detailed error logging
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    
    // Throw a more descriptive error
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error: Please check your internet connection and try again');
    }
    
    throw new Error(error.response?.data?.error || 'Failed to upload image');
  }
}
