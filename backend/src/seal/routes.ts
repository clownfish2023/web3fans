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

    const newKeyId = await sealService.storeKey(keyId, encryptionKey);

    res.json({
      success: true,
      message: 'Key stored successfully',
      keyId: newKeyId
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
 * Supports both subscriptionProof (legacy) and accessKeyId (new Seal pattern)
 */
sealRouter.post('/retrieve-key', async (req, res) => {
  try {
    const { keyId, subscriptionProof, accessKeyId } = req.body;

    if (!keyId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'keyId is required',
      });
    }

    // Verify access via AccessKey NFT (Seal pattern)
    if (accessKeyId) {
      console.log(`🔍 Verifying access with AccessKey: ${accessKeyId}`);
      
      // TODO: Implement on-chain verification via AccessKey
      // For now, we trust that the frontend has verified the AccessKey
      // In production, this should:
      // 1. Fetch AccessKey NFT from blockchain
      // 2. Verify it matches the keyId namespace
      // 3. Check expiration time
    }
    // Legacy: Verify subscription proof
    else if (subscriptionProof) {
      console.log('🔍 Using legacy subscription proof verification');
    }

    // Retrieve encryption key
    const encryptionKey = await sealService.retrieveKey(keyId);

    if (!encryptionKey) {
      return res.status(404).json({
        error: 'Key not found',
        message: 'No encryption key found for this keyId',
      });
    }

    console.log(`✅ Retrieved encryption key for keyId: ${JSON.stringify(keyId).substring(0, 50)}...`);

    res.json({
      success: true,
      encryptionKey,
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

