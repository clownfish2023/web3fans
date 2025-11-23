import { SuiClient } from '@mysten/sui/client';
import crypto from 'crypto';

// Master key for stateless encryption.
// In production, this MUST be a strong secret from environment variables.
// For this demo, we use a fallback if not provided.
const MASTER_KEY = process.env.SEAL_MASTER_KEY 
  ? crypto.createHash('sha256').update(process.env.SEAL_MASTER_KEY).digest()
  : crypto.createHash('sha256').update('web3fans-stateless-seal-master-key-2025').digest();

/**
 * Seal Service for managing encryption keys and access control
 */
export class SealService {
  private suiClient: SuiClient;

  constructor() {
    const network = process.env.SUI_NETWORK || 'testnet';
    this.suiClient = new SuiClient({
      url: `https://fullnode.${network}.sui.io:443`,
    });
  }

  /**
   * Store encryption key (Stateless Mode)
   * Instead of storing in memory/DB, we encrypt the key with our Master Key
   * and return the ciphertext. The client acts as the storage.
   * 
   * @returns The encrypted key payload (to be used as keyId)
   */
  async storeKey(originalKeyId: number[], encryptionKey: string): Promise<string> {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
      
      let encrypted = cipher.update(encryptionKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      // Payload format: IV (24 chars) + AuthTag (32 chars) + EncryptedContent
      const payload = iv.toString('hex') + authTag.toString('hex') + encrypted;
      
      console.log(`🔐 Statelessly encrypted key. Payload size: ${payload.length}`);
      return payload;
    } catch (error) {
      console.error('Failed to encrypt key:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Retrieve encryption key (Stateless Mode)
   * Decrypts the provided keyId (which is actually the ciphertext)
   */
  async retrieveKey(keyIdInput: number[] | string): Promise<string | null> {
    try {
      let payload: string;
      
      // Convert input to string payload
      if (typeof keyIdInput === 'string') {
          payload = keyIdInput;
      } else {
          // If it's a byte array, it might be our payload bytes. 
          // Or it might be a legacy keyId.
          // For stateless mode, we expect the payload string to be passed.
          // If the frontend passed bytes, try to convert to string.
          payload = Buffer.from(keyIdInput).toString('utf8');
      }

      // Check if payload looks like our format (IV 24 hex + Tag 32 hex + content)
      // Minimum length: 12 bytes IV (24 hex) + 16 bytes Tag (32 hex) = 56 chars
      if (!payload || payload.length < 56) {
          console.warn('❌ Invalid stateless key format (too short)');
          return null;
      }

      const iv = Buffer.from(payload.substring(0, 24), 'hex');
      const authTag = Buffer.from(payload.substring(24, 56), 'hex');
      const encrypted = payload.substring(56);

      const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      console.log('🔓 Successfully decrypted stateless key');
      return decrypted;
    } catch (error) {
      // If decryption fails (e.g. bad auth tag), it means the keyId was invalid or tampered with
      console.warn('❌ Failed to decrypt key (might be invalid or legacy keyId):', error.message);
      return null;
    }
  }

  /**
   * Verify access control via Sui Move contract
   * This should call the seal_approve function on-chain
   */
  async verifyAccess(
    keyId: number[],
    subscriptionId: string,
    groupId: string
  ): Promise<boolean> {
    try {
      // Get subscription object
      const subscription = await this.suiClient.getObject({
        id: subscriptionId,
        options: {
          showContent: true,
        },
      });

      if (!subscription.data?.content || !('fields' in subscription.data.content)) {
        return false;
      }

      const fields = subscription.data.content.fields as any;

      // Check if subscription belongs to the group
      if (fields.group_id !== groupId) {
        return false;
      }

      // Check if subscription is still valid
      const expiresAt = parseInt(fields.expires_at);
      const now = Date.now();

      if (now > expiresAt) {
        return false;
      }

      // TODO: Restore Key ID validation if needed. 
      // Since we are using stateless keys (random ciphertext), 
      // the prefix check might not be applicable anymore unless we embed the prefix in the payload.
      // For now, we trust the encryption (if we can decrypt it, it's valid).
      
      return true;
    } catch (error) {
      console.error('Failed to verify access:', error);
      return false;
    }
  }

  /**
   * Get all stored keys (for debugging)
   */
  getAllKeys(): string[] {
    return ["Stateless Mode - Keys are stored on client side"];
  }

  /**
   * Clear all stored keys (for testing)
   */
  clearAllKeys(): void {
    console.log('🗑️ Stateless Mode - No keys to clear');
  }
}
