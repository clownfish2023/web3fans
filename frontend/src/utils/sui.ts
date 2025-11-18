import { MIST_PER_SUI } from '@/config/constants';

/**
 * Convert SUI to MIST
 */
export function suiToMist(sui: number): bigint {
  return BigInt(Math.floor(sui * MIST_PER_SUI));
}

/**
 * Convert MIST to SUI
 */
export function mistToSui(mist: bigint | string): number {
  const mistValue = typeof mist === 'string' ? BigInt(mist) : mist;
  return Number(mistValue) / MIST_PER_SUI;
}

/**
 * Format SUI amount for display
 */
export function formatSui(mist: bigint | string, decimals = 2): string {
  const sui = mistToSui(mist);
  return sui.toFixed(decimals) + ' SUI';
}

/**
 * Format address for display (show first and last 4 chars)
 */
export function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Generate seal key ID from group ID and report ID
 */
export function generateSealKeyId(groupId: string, reportId: string, nonce: number = 0): Uint8Array {
  // Convert hex strings to bytes
  const groupIdBytes = hexToBytes(groupId);
  const reportIdBytes = hexToBytes(reportId);
  const nonceBytes = new Uint8Array([nonce]);
  
  // Concatenate bytes
  const keyId = new Uint8Array(groupIdBytes.length + reportIdBytes.length + 1);
  keyId.set(groupIdBytes, 0);
  keyId.set(reportIdBytes, groupIdBytes.length);
  keyId.set(nonceBytes, groupIdBytes.length + reportIdBytes.length);
  
  return keyId;
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Check if subscription is expired
 */
export function isSubscriptionExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate remaining time in human readable format
 */
export function getRemainingTime(expiresAt: number): string {
  const now = Date.now();
  const diff = expiresAt - now;
  
  if (diff <= 0) return 'Expired';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days} days remaining`;
  if (hours > 0) return `${hours} hours remaining`;
  return 'Expiring soon';
}

