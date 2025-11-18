import { WALRUS_PUBLISHER_URL, WALRUS_AGGREGATOR_URL } from '@/config/constants';

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string;
      storedEpoch: number;
      blobId: string;
      size: number;
      erasureCodeType: string;
      certifiedEpoch: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      };
    };
    encodedSize: number;
    cost: number;
  };
  alreadyCertified?: {
    blobId: string;
    event: any;
    endEpoch: number;
  };
}

/**
 * Upload file to Walrus
 */
export async function uploadToWalrus(
  file: Blob,
  epochs: number = 1
): Promise<WalrusUploadResponse> {
  const response = await fetch(
    `${WALRUS_PUBLISHER_URL}/v1/store?epochs=${epochs}`,
    {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload to Walrus: ${error}`);
  }

  return await response.json();
}

/**
 * Download file from Walrus
 */
export async function downloadFromWalrus(blobId: string): Promise<Blob> {
  const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/${blobId}`);

  if (!response.ok) {
    throw new Error(`Failed to download from Walrus: ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * Get blob info from Walrus
 */
export async function getBlobInfo(blobId: string): Promise<any> {
  const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/${blobId}/info`);

  if (!response.ok) {
    throw new Error(`Failed to get blob info: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Upload encrypted report to Walrus
 */
export async function uploadEncryptedReport(
  encryptedFile: Blob,
  epochs: number = 100
): Promise<string> {
  const result = await uploadToWalrus(encryptedFile, epochs);
  
  if (result.newlyCreated) {
    return result.newlyCreated.blobObject.blobId;
  } else if (result.alreadyCertified) {
    return result.alreadyCertified.blobId;
  }
  
  throw new Error('Failed to get blob ID from upload response');
}

/**
 * Download and decrypt report from Walrus
 */
export async function downloadEncryptedReport(blobId: string): Promise<Blob> {
  return await downloadFromWalrus(blobId);
}

