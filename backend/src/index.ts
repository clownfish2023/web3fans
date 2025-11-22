import './env.js'; // Must be the first import to load env vars before other imports
import express from 'express';
import cors from 'cors';
import { telegramRouter } from './telegram/routes.js';
import { sealRouter } from './seal/routes.js';
import { walrusRouter } from './walrus/routes.js';
import { reportsRouter } from './reports/routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/telegram', telegramRouter);
app.use('/seal', sealRouter);
app.use('/walrus', walrusRouter);
app.use('/reports', reportsRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Telegram bot is ${process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'NOT configured'}`);
  console.log(`🔐 Seal service is ready`);
  console.log(`💾 Walrus integration is ready`);
});

