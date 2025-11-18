import { SuiClient } from '@mysten/sui/client';

/**
 * Seal Service for managing encryption keys and access control
 */
export class SealService {
  private keys: Map<string, string> = new Map();
  private suiClient: SuiClient;

  constructor() {
    const network = process.env.SUI_NETWORK || 'testnet';
    this.suiClient = new SuiClient({
      url: `https://fullnode.${network}.sui.io:443`,
    });
  }

  /**
   * Store encryption key
   * In production, this should store the key in a secure enclave or HSM
   */
  async storeKey(keyId: number[], encryptionKey: string): Promise<void> {
    const keyIdString = JSON.stringify(keyId);
    this.keys.set(keyIdString, encryptionKey);
    console.log(`✅ Stored encryption key for keyId: ${keyIdString.substring(0, 50)}...`);
  }

  /**
   * Retrieve encryption key
   * In production, access control should be verified before returning the key
   */
  async retrieveKey(keyId: number[]): Promise<string | null> {
    const keyIdString = JSON.stringify(keyId);
    const key = this.keys.get(keyIdString);
    
    if (key) {
      console.log(`✅ Retrieved encryption key for keyId: ${keyIdString.substring(0, 50)}...`);
    } else {
      console.log(`❌ No encryption key found for keyId: ${keyIdString.substring(0, 50)}...`);
    }
    
    return key || null;
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

      // Verify keyId prefix matches groupId
      const groupIdBytes = Buffer.from(groupId.replace('0x', ''), 'hex');
      const keyIdBytes = Buffer.from(keyId);

      if (keyIdBytes.length < groupIdBytes.length) {
        return false;
      }

      for (let i = 0; i < groupIdBytes.length; i++) {
        if (keyIdBytes[i] !== groupIdBytes[i]) {
          return false;
        }
      }

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
    return Array.from(this.keys.keys());
  }

  /**
   * Clear all stored keys (for testing)
   */
  clearAllKeys(): void {
    this.keys.clear();
    console.log('🗑️ Cleared all stored keys');
  }
}

