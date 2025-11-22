import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars using absolute path (assumes .env is in backend root, one level up from src)
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Warning: .env file not found at ${envPath}`);
} else {
  console.log(`✅ Environment variables loaded from ${envPath}`);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    console.log(`✅ TELEGRAM_BOT_TOKEN found: ${token.substring(0, 5)}...`);
  } else {
    console.warn(`⚠️  TELEGRAM_BOT_TOKEN is undefined or empty in .env file`);
    console.log('Current env keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_')));
  }
}

