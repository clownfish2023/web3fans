import { useState } from 'react';
import { API_URL } from '@/config/constants';
import { TelegramUser } from '@/types';

export function useTelegram() {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Link Sui address with Telegram ID
   */
  const linkTelegramAccount = async (
    suiAddress: string,
    telegramId: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/telegram/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suiAddress,
          telegramId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to link Telegram account');
      }

      const data = await response.json();
      setTelegramUser(data.telegramUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get Telegram user info by Sui address
   */
  const getTelegramUser = async (suiAddress: string): Promise<TelegramUser | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/telegram/user/${suiAddress}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to get Telegram user');
      }

      const data = await response.json();
      setTelegramUser(data.telegramUser);
      return data.telegramUser;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send notification to Telegram group
   */
  const sendTelegramNotification = async (
    groupId: string,
    message: string
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/telegram/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send Telegram notification');
      }
    } catch (err) {
      console.error('Failed to send Telegram notification:', err);
      // Don't throw here, as this is not critical
    }
  };

  /**
   * Generate Telegram login link
   */
  const getTelegramLoginUrl = (): string => {
    return `${API_URL}/telegram/login`;
  };

  return {
    telegramUser,
    isLoading,
    error,
    linkTelegramAccount,
    getTelegramUser,
    sendTelegramNotification,
    getTelegramLoginUrl,
  };
}

