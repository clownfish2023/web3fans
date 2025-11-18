import express from 'express';
import { TelegramService } from './service.js';
import { Database } from '../database/index.js';

export const telegramRouter = express.Router();
const telegramService = new TelegramService();
const database = new Database();

/**
 * Link Sui address with Telegram ID
 */
telegramRouter.post('/link', async (req, res) => {
  try {
    const { suiAddress, telegramId } = req.body;

    if (!suiAddress || !telegramId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'suiAddress and telegramId are required',
      });
    }

    // Store the link in database
    await database.linkAccount(suiAddress, telegramId);

    res.json({
      success: true,
      message: 'Account linked successfully',
      data: {
        suiAddress,
        telegramId,
      },
    });
  } catch (error) {
    console.error('Failed to link account:', error);
    res.status(500).json({
      error: 'Failed to link account',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get Telegram user by Sui address
 */
telegramRouter.get('/user/:suiAddress', async (req, res) => {
  try {
    const { suiAddress } = req.params;

    const telegramId = await database.getTelegramId(suiAddress);

    if (!telegramId) {
      return res.status(404).json({
        error: 'Not found',
        message: 'No Telegram account linked to this address',
      });
    }

    res.json({
      success: true,
      data: {
        suiAddress,
        telegramId,
      },
    });
  } catch (error) {
    console.error('Failed to get telegram user:', error);
    res.status(500).json({
      error: 'Failed to get telegram user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Send notification to Telegram group
 */
telegramRouter.post('/notify', async (req, res) => {
  try {
    const { groupId, message } = req.body;

    if (!groupId || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'groupId and message are required',
      });
    }

    await telegramService.sendMessage(groupId, message);

    res.json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get Telegram login URL
 */
telegramRouter.get('/login', async (req, res) => {
  try {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    
    if (!botUsername) {
      throw new Error('Telegram bot username not configured');
    }

    const loginUrl = `https://t.me/${botUsername}?start=link`;

    res.json({
      success: true,
      data: {
        loginUrl,
      },
    });
  } catch (error) {
    console.error('Failed to get login URL:', error);
    res.status(500).json({
      error: 'Failed to get login URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Webhook endpoint for Telegram bot
 */
telegramRouter.post('/webhook', async (req, res) => {
  try {
    await telegramService.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Failed to handle webhook:', error);
    res.sendStatus(500);
  }
});

