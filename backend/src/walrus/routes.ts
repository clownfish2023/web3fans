import express from 'express';
import { WalrusService } from './service.js';

export const walrusRouter = express.Router();
const walrusService = new WalrusService();

/**
 * Upload file to Walrus
 */
walrusRouter.post('/upload', async (req, res) => {
  try {
    const { content, epochs } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'content is required',
      });
    }

    const blobId = await walrusService.upload(content, epochs || 100);

    res.json({
      success: true,
      data: {
        blobId,
      },
    });
  } catch (error) {
    console.error('Failed to upload to Walrus:', error);
    res.status(500).json({
      error: 'Failed to upload to Walrus',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Download file from Walrus
 */
walrusRouter.get('/download/:blobId', async (req, res) => {
  try {
    const { blobId } = req.params;

    const content = await walrusService.download(blobId);

    res.json({
      success: true,
      data: {
        content,
      },
    });
  } catch (error) {
    console.error('Failed to download from Walrus:', error);
    res.status(500).json({
      error: 'Failed to download from Walrus',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get blob info
 */
walrusRouter.get('/info/:blobId', async (req, res) => {
  try {
    const { blobId } = req.params;

    const info = await walrusService.getBlobInfo(blobId);

    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    console.error('Failed to get blob info:', error);
    res.status(500).json({
      error: 'Failed to get blob info',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

