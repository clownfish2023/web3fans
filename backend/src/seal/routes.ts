import express from 'express';
import { SealService } from './service.js';

export const sealRouter = express.Router();
const sealService = new SealService();

/**
 * Store encryption key in Seal
 */
sealRouter.post('/store-key', async (req, res) => {
  try {
    const { keyId, encryptionKey } = req.body;

    if (!keyId || !encryptionKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'keyId and encryptionKey are required',
      });
    }

    await sealService.storeKey(keyId, encryptionKey);

    res.json({
      success: true,
      message: 'Key stored successfully',
    });
  } catch (error) {
    console.error('Failed to store key:', error);
    res.status(500).json({
      error: 'Failed to store key',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Retrieve encryption key from Seal
 */
sealRouter.post('/retrieve-key', async (req, res) => {
  try {
    const { keyId, subscriptionProof } = req.body;

    if (!keyId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'keyId is required',
      });
    }

    // Verify subscription proof (in production, this should verify on-chain)
    // For now, we'll return the key if it exists
    const encryptionKey = await sealService.retrieveKey(keyId);

    if (!encryptionKey) {
      return res.status(404).json({
        error: 'Key not found',
        message: 'No encryption key found for this keyId',
      });
    }

    res.json({
      success: true,
      data: {
        encryptionKey,
      },
    });
  } catch (error) {
    console.error('Failed to retrieve key:', error);
    res.status(500).json({
      error: 'Failed to retrieve key',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Verify access control
 */
sealRouter.post('/verify-access', async (req, res) => {
  try {
    const { keyId, subscriptionId, groupId } = req.body;

    if (!keyId || !subscriptionId || !groupId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'keyId, subscriptionId, and groupId are required',
      });
    }

    // In production, this should call the on-chain seal_approve function
    const hasAccess = await sealService.verifyAccess(keyId, subscriptionId, groupId);

    res.json({
      success: true,
      data: {
        hasAccess,
      },
    });
  } catch (error) {
    console.error('Failed to verify access:', error);
    res.status(500).json({
      error: 'Failed to verify access',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

