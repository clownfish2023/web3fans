/**
 * Encryption utilities for Seal integration
 * Using Web Crypto API for AES-GCM encryption
 */

export interface EncryptedFileData {
  encryptedBlob: Blob;
  keyId: Uint8Array;
  encryptionKey: Uint8Array;
}

/**
 * Generate a random encryption key (32 bytes for AES-256)
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to raw bytes
 */
export async function exportKeyBytes(key: CryptoKey): Promise<Uint8Array> {
  const keyBuffer = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(keyBuffer);
}

/**
 * Import key from raw bytes
 */
export async function importKeyBytes(keyBytes: Uint8Array): Promise<CryptoKey> {
  // Convert Uint8Array to ArrayBuffer for importKey
  // Use slice to create a new ArrayBuffer to avoid SharedArrayBuffer issues
  const buffer = new ArrayBuffer(keyBytes.byteLength);
  const view = new Uint8Array(buffer);
  view.set(keyBytes);
  
  return await crypto.subtle.importKey(
    'raw',
    buffer,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt file for Seal/Walrus storage
 * Returns encrypted data with IV and keyId
 */
export async function encryptFile(
  file: File,
  groupId: string
): Promise<EncryptedFileData> {
  // Generate encryption key
  const key = await generateEncryptionKey();
  const keyBytes = await exportKeyBytes(key);
  
  // Read file content
  const fileBuffer = await file.arrayBuffer();
  
  // Generate IV (Initialization Vector)
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  
  // Encrypt the file
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    fileBuffer
  );
  
  // Generate keyId: groupId (32 bytes) + reportId (8 bytes random) + nonce (8 bytes random)
  const groupIdBytes = hexToBytes(groupId.replace('0x', '').padStart(64, '0'));
  const reportIdBytes = crypto.getRandomValues(new Uint8Array(8));
  const nonceBytes = crypto.getRandomValues(new Uint8Array(8));
  
  const keyId = new Uint8Array(48); // 32 + 8 + 8
  keyId.set(groupIdBytes, 0);
  keyId.set(reportIdBytes, 32);
  keyId.set(nonceBytes, 40);
  
  // Combine IV + ciphertext into a single blob
  // Format: [IV(12 bytes)][ciphertext]
  const encryptedData = new Uint8Array(iv.length + ciphertext.byteLength);
  encryptedData.set(iv, 0);
  encryptedData.set(new Uint8Array(ciphertext), iv.length);
  
  const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' });
  
  return {
    encryptedBlob,
    keyId,
    encryptionKey: keyBytes,
  };
}

/**
 * Decrypt file from Walrus
 */
export async function decryptFile(
  encryptedBlob: Blob,
  encryptionKey: Uint8Array
): Promise<Blob> {
  try {
    // Read encrypted data
    const encryptedBuffer = await encryptedBlob.arrayBuffer();
    const encryptedData = new Uint8Array(encryptedBuffer);
    
    if (encryptedData.length < 12) {
      throw new Error('Invalid encrypted data: too short (missing IV)');
    }
    
    const iv = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);
    
    // Import key
    const key = await importKeyBytes(encryptionKey);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );
    
    return new Blob([decrypted], { type: 'application/octet-stream' });
  } catch (error: any) {
    if (error.name === 'OperationError') {
      throw new Error('Decryption failed: The encryption key is incorrect or the file is corrupted.');
    }
    throw error;
  }
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert bytes to base64
 */
export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert base64 to bytes
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Store encryption key in backend Seal service
 * Returns the new stateless keyId (as bytes) that SHOULD be used instead of the generated one
 */
export async function storeKeyInSeal(
  keyId: Uint8Array,
  encryptionKey: Uint8Array,
  apiUrl: string
): Promise<Uint8Array> {
  const keyBase64 = bytesToBase64(encryptionKey);
  
  const response = await fetch(`${apiUrl}/seal/store-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyId: Array.from(keyId),
      encryptionKey: keyBase64,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to store key in Seal: ${error}`);
  }
  
  const data = await response.json();
  
  // If backend returns a new keyId (Stateless Mode), use it!
  if (data.keyId && typeof data.keyId === 'string') {
    console.log('🔐 Received stateless keyId from backend');
    return new TextEncoder().encode(data.keyId);
  }
  
  return keyId;
}

/**
 * Retrieve encryption key from backend Seal service
 */
export async function retrieveKeyFromSeal(
  keyId: Uint8Array,
  accessKeyId: string,
  apiUrl: string
): Promise<Uint8Array> {
  const response = await fetch(`${apiUrl}/seal/retrieve-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyId: Array.from(keyId),
      accessKeyId,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to retrieve key from Seal: ${error}`);
  }
  
  const data = await response.json();
  return base64ToBytes(data.encryptionKey);
}
