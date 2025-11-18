import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

export class TelegramService {
  private bot: TelegramBot | null = null;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (token) {
      this.bot = new TelegramBot(token, { polling: true });
      this.setupHandlers();
      console.log('✅ Telegram bot initialized');
    } else {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN not set, Telegram features will be disabled');
    }
  }

  private setupHandlers() {
    if (!this.bot) return;

    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const username = msg.from?.username || 'User';

      await this.bot!.sendMessage(
        chatId,
        `👋 Welcome to Web3 Investment Research Subscription Platform!\n\n` +
        `Your Telegram ID: ${msg.from?.id}\n` +
        `Username: @${username}\n\n` +
        `Please use this ID to link your Sui wallet address in the DApp.`
      );
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;

      await this.bot!.sendMessage(
        chatId,
        `📚 Help Information\n\n` +
        `Available commands:\n` +
        `/start - Get your Telegram ID\n` +
        `/help - Show help information\n` +
        `/link - Link wallet address\n\n` +
        `For more help, please visit our website.`
      );
    });

    // Handle /link command
    this.bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const suiAddress = match?.[1];

      if (!suiAddress) {
        await this.bot!.sendMessage(
          chatId,
          '❌ Please provide a valid Sui address\nUsage: /link 0x...'
        );
        return;
      }

      await this.bot!.sendMessage(
        chatId,
        `✅ Address recorded!\n\n` +
        `Telegram ID: ${msg.from?.id}\n` +
        `Sui Address: ${suiAddress}\n\n` +
        `Please complete the linking process in the DApp.`
      );
    });
  }

  /**
   * Send message to a Telegram chat
   */
  async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.bot) {
      console.warn('Telegram bot not initialized, skipping message');
      return;
    }

    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      throw error;
    }
  }

  /**
   * Send message with inline keyboard
   */
  async sendMessageWithButtons(
    chatId: string,
    message: string,
    buttons: Array<{ text: string; url: string }>
  ): Promise<void> {
    if (!this.bot) {
      console.warn('Telegram bot not initialized, skipping message');
      return;
    }

    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            buttons.map(btn => ({
              text: btn.text,
              url: btn.url,
            })),
          ],
        },
      });
    } catch (error) {
      console.error('Failed to send Telegram message with buttons:', error);
      throw error;
    }
  }

  /**
   * Handle webhook updates
   */
  async handleUpdate(update: any): Promise<void> {
    if (!this.bot) {
      console.warn('Telegram bot not initialized, skipping update');
      return;
    }

    try {
      await this.bot.processUpdate(update);
    } catch (error) {
      console.error('Failed to process Telegram update:', error);
      throw error;
    }
  }

  /**
   * Get bot info
   */
  async getBotInfo(): Promise<any> {
    if (!this.bot) {
      throw new Error('Telegram bot not initialized');
    }

    return await this.bot.getMe();
  }
}

