/**
 * Simple in-memory database for demo purposes
 * In production, use a proper database like PostgreSQL, MongoDB, etc.
 */
export class Database {
  private suiToTelegram: Map<string, string> = new Map();
  private telegramToSui: Map<string, string> = new Map();

  /**
   * Link Sui address with Telegram ID
   */
  async linkAccount(suiAddress: string, telegramId: string): Promise<void> {
    this.suiToTelegram.set(suiAddress, telegramId);
    this.telegramToSui.set(telegramId, suiAddress);
    console.log(`✅ Linked: ${suiAddress} <-> ${telegramId}`);
  }

  /**
   * Get Telegram ID by Sui address
   */
  async getTelegramId(suiAddress: string): Promise<string | null> {
    return this.suiToTelegram.get(suiAddress) || null;
  }

  /**
   * Get Sui address by Telegram ID
   */
  async getSuiAddress(telegramId: string): Promise<string | null> {
    return this.telegramToSui.get(telegramId) || null;
  }

  /**
   * Unlink account
   */
  async unlinkAccount(suiAddress: string): Promise<void> {
    const telegramId = this.suiToTelegram.get(suiAddress);
    if (telegramId) {
      this.suiToTelegram.delete(suiAddress);
      this.telegramToSui.delete(telegramId);
      console.log(`✅ Unlinked: ${suiAddress}`);
    }
  }

  /**
   * Get all linked accounts
   */
  async getAllLinks(): Promise<Array<{ suiAddress: string; telegramId: string }>> {
    return Array.from(this.suiToTelegram.entries()).map(([suiAddress, telegramId]) => ({
      suiAddress,
      telegramId,
    }));
  }

  /**
   * Clear all links (for testing)
   */
  async clearAll(): Promise<void> {
    this.suiToTelegram.clear();
    this.telegramToSui.clear();
    console.log('🗑️ Cleared all account links');
  }
}

