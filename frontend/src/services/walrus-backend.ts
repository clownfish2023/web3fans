import { API_URL } from '@/config/constants';

/**
 * Upload file to Walrus via backend proxy
 * This avoids CORS issues when uploading directly
 */
export async function uploadViaBackend(
  file: Blob,
  epochs: number = 1  // Walrus testnet typically allows 1-5 epochs
): Promise<string> {
  const response = await fetch(
    `${API_URL}/walrus/upload?epochs=${epochs}`,
    {
      method: 'POST',
      body: file,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Backend upload failed: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.blobId;
}

/**
 * Download file from Walrus via backend proxy
 */
export async function downloadViaBackend(blobId: string): Promise<Blob> {
  const response = await fetch(`${API_URL}/walrus/download/${blobId}`);

  if (!response.ok) {
    throw new Error(`Backend download failed: ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * Get blob info from Walrus via backend proxy
 */
export async function getBlobInfoViaBackend(blobId: string): Promise<any> {
  const response = await fetch(`${API_URL}/walrus/info/${blobId}`);

  if (!response.ok) {
    throw new Error(`Failed to get blob info: ${response.statusText}`);
  }

  const data = await response.json();
  return data.info;
}

/**
 * Upload encrypted report to Walrus via backend
 * 
 * @param encryptedFile - Encrypted file blob
 * @param epochs - Storage duration (Walrus testnet typically allows 1-5 epochs, 1 epoch ≈ 1 day)
 * @returns Walrus blob ID
 */
export async function uploadEncryptedReportViaBackend(
  encryptedFile: Blob,
  epochs: number = 1
): Promise<string> {
  console.log('📤 Uploading via backend proxy...');
  return await uploadViaBackend(encryptedFile, epochs);
}

/**
 * Download encrypted report from Walrus via backend
 * 
 * @param blobId - Walrus blob ID
 * @returns Encrypted file blob
 */
export async function downloadFromWalrusViaBackend(blobId: string): Promise<Blob> {
  console.log('📥 Downloading from Walrus via backend proxy...');
  return await downloadViaBackend(blobId);
}

