import express from 'express';
import { reportService } from './service.js';
import { TelegramService } from '../telegram/service.js';

export const reportsRouter = express.Router();
const telegramService = new TelegramService();

// Share / Preview Endpoint (Meta Tags Proxy)
reportsRouter.get('/share/:id', async (req, res) => {
  const { id } = req.params; // id is the Walrus Blob ID of the Manifest
  const report = await reportService.getReportMetadata(id);

  if (!report) {
    return res.status(404).send('Report not found or could not be fetched from Walrus');
  }

  // URL Configuration
  // FRONTEND_URL: The actual DApp URL where users read the report
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const targetUrl = `${FRONTEND_URL}/reports/${id}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <!-- Open Graph / Facebook / Telegram -->
      <meta property="og:type" content="article" />
      <meta property="og:url" content="${targetUrl}" />
      <meta property="og:title" content="${report.title}" />
      <meta property="og:description" content="${report.summary}" />
      <meta property="og:image" content="${report.imageUrl}" />
      
      <!-- Twitter -->
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content="${targetUrl}" />
      <meta property="twitter:title" content="${report.title}" />
      <meta property="twitter:description" content="${report.summary}" />
      <meta property="twitter:image" content="${report.imageUrl}" />
      
      <title>${report.title}</title>
      
      <script>
        window.location.href = "${targetUrl}";
      </script>
    </head>
    <body>
      <h1>${report.title}</h1>
      <p>${report.summary}</p>
      <p>Redirecting to full report...</p>
      <a href="${targetUrl}">Click here if not redirected</a>
    </body>
    </html>
  `;

  res.send(html);
});

// Publish Endpoint - Triggered by Frontend after uploading to Walrus
reportsRouter.post('/publish', async (req, res) => {
  console.log('[DEBUG] Received /publish request body:', req.body);
  const { manifestBlobId } = req.body;

  if (!manifestBlobId) {
    console.warn('[DEBUG] manifestBlobId is missing in request');
    return res.status(400).json({ error: 'manifestBlobId is required' });
  }

  console.log(`🚀 Publishing report with Manifest ID: ${manifestBlobId}`);

  // 1. Verify we can fetch the manifest
  console.log('[DEBUG] Fetching manifest from Walrus...');
  const manifest = await reportService.getReportMetadata(manifestBlobId);

  if (!manifest) {
    console.error('[DEBUG] Failed to fetch manifest from Walrus (returned null)');
    return res.status(404).json({ error: 'Manifest not found on Walrus. Please wait a moment for propagation or check the ID.' });
  }
  console.log('[DEBUG] Manifest fetched successfully:', manifest.title);

  // 2. Prepare notification
  const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
  console.log(`[DEBUG] TELEGRAM_CHANNEL_ID from env: ${CHANNEL_ID}`);
  
  if (!CHANNEL_ID) {
    console.warn('⚠️ TELEGRAM_CHANNEL_ID is not set. Skipping Telegram notification.');
    return res.json({ 
      success: true, 
      message: 'Report published, but Telegram notification skipped (Channel ID missing)',
      manifest 
    });
  }

  // Construct the "Share URL"
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const readUrl = `${FRONTEND_URL}/reports/${manifestBlobId}`;

  try {
    const message = `📢 *New Report Published*\n\n` +
      `*${manifest.title}*\n\n` +
      `${manifest.summary}\n\n` +
      `📅 ${manifest.publishDate || new Date().toLocaleDateString()}`;

    console.log(`[DEBUG] Sending Telegram message to ${CHANNEL_ID}...`);
    await telegramService.sendMessageWithButtons(CHANNEL_ID, message, [
      { text: '📖 Read Full Report', url: readUrl }
    ]);

    console.log(`✅ Notification sent to channel ${CHANNEL_ID}`);
    
    res.json({ 
      success: true, 
      message: 'Report published and notification sent',
      manifest
    });

  } catch (error: any) {
    console.error('Failed to send Telegram notification:', error);
    // Log the full error object for debugging
    console.error('[DEBUG] Full Telegram Error:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send Telegram notification',
      details: error.message 
    });
  }
});

// Helper to fetch metadata for frontend
reportsRouter.get('/:id/metadata', async (req, res) => {
  const { id } = req.params;
  const report = await reportService.getReportMetadata(id);
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  res.json(report);
});
