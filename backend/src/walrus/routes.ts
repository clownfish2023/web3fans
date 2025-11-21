import express from 'express';
import { WalrusService } from './service.js';

export const walrusRouter = express.Router();
const walrusService = new WalrusService();

/**
 * Upload file to Walrus via backend proxy using multipart/form-data
 * This avoids CORS issues
 */
walrusRouter.post('/upload', async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        // Default to 1 epoch for testnet (Walrus testnet has strict limits)
        // 1 epoch ≈ 1 day on testnet
        const epochs = parseInt(req.query.epochs as string) || 1;
        
        console.log(`📤 Uploading file to Walrus (${buffer.length} bytes, ${epochs} epochs)`);
        
        // Upload using multipart/form-data format
        const blobId = await walrusService.upload(buffer.toString('base64'), epochs);
        
        res.json({
          success: true,
          blobId,
          size: buffer.length,
        });
      } catch (error: any) {
        console.error('Failed to upload to Walrus:', error);
        res.status(500).json({
          error: 'Upload failed',
          message: error.response?.data || error.message || 'Unknown error',
        });
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Download file from Walrus via backend proxy
 */
walrusRouter.get('/download/:blobId', async (req, res) => {
  try {
    const { blobId } = req.params;
    
    console.log(`📥 Downloading file from Walrus (${blobId})`);
    
    const content = await walrusService.download(blobId);
    
    // Return as binary data
    const buffer = Buffer.from(content, 'base64');
    res.set('Content-Type', 'application/octet-stream');
    res.send(buffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get blob info from Walrus
 */
walrusRouter.get('/info/:blobId', async (req, res) => {
  try {
    const { blobId } = req.params;
    
    const info = await walrusService.getBlobInfo(blobId);
    
    res.json({
      success: true,
      info,
    });
  } catch (error) {
    console.error('Get blob info error:', error);
    res.status(500).json({
      error: 'Failed to get blob info',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Health check
 */
walrusRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Walrus Proxy',
    timestamp: new Date().toISOString(),
  });
});
