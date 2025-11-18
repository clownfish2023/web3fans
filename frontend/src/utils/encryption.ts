import CryptoJS from 'crypto-js';

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  return CryptoJS.lib.WordArray.random(256 / 8).toString();
}

/**
 * Encrypt content with AES
 */
export function encryptContent(content: string, key: string): string {
  return CryptoJS.AES.encrypt(content, key).toString();
}

/**
 * Decrypt content with AES
 */
export function decryptContent(encryptedContent: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedContent, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Encrypt file
 */
export async function encryptFile(file: File, key: string): Promise<Blob> {
  const content = await file.arrayBuffer();
  const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(content) as any);
  const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();
  return new Blob([encrypted], { type: 'application/octet-stream' });
}

/**
 * Decrypt file
 */
export async function decryptFile(encryptedBlob: Blob, key: string): Promise<Blob> {
  const encryptedContent = await encryptedBlob.text();
  const decrypted = CryptoJS.AES.decrypt(encryptedContent, key);
  const wordArray = decrypted.words;
  const uint8Array = new Uint8Array(wordArray.length * 4);
  
  for (let i = 0; i < wordArray.length; i++) {
    const word = wordArray[i];
    uint8Array[i * 4] = (word >> 24) & 0xff;
    uint8Array[i * 4 + 1] = (word >> 16) & 0xff;
    uint8Array[i * 4 + 2] = (word >> 8) & 0xff;
    uint8Array[i * 4 + 3] = word & 0xff;
  }
  
  return new Blob([uint8Array]);
}

/**
 * Store encryption key in Seal (this would be handled by the backend)
 */
export async function storeKeyInSeal(
  keyId: Uint8Array,
  encryptionKey: string,
  apiUrl: string
): Promise<void> {
  const response = await fetch(`${apiUrl}/seal/store-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyId: Array.from(keyId),
      encryptionKey,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to store key in Seal');
  }
}

/**
 * Retrieve encryption key from Seal
 */
export async function retrieveKeyFromSeal(
  keyId: Uint8Array,
  subscriptionProof: any,
  apiUrl: string
): Promise<string> {
  const response = await fetch(`${apiUrl}/seal/retrieve-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyId: Array.from(keyId),
      subscriptionProof,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to retrieve key from Seal');
  }
  
  const data = await response.json();
  return data.encryptionKey;
}

