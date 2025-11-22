import { WALRUS_PUBLISHER_URL, WALRUS_AGGREGATOR_URL } from '@/config/constants';

export interface WalrusUploadResponse {
  // New Walrus API structure with blobStoreResult wrapper
  blobStoreResult?: {
    newlyCreated?: {
      blobObject: {
        id: string;
        registeredEpoch: number;
        blobId: string;
        size: number;
        encodingType: string;
        certifiedEpoch: number | null;
        storage: {
          id: string;
          startEpoch: number;
          endEpoch: number;
          storageSize: number;
        };
        deletable: boolean;
      };
      resourceOperation: any;
      cost: number;
    };
    alreadyCertified?: {
      blobId: string;
      event: any;
      endEpoch: number;
    };
  };
  storedQuiltBlobs?: Array<{
    identifier: string;
    quiltPatchId: string;
    range: [number, number];
  }>;
  
  // Old structure (backward compatibility)
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
 * Upload file to Walrus using the new /v1/quilts endpoint with multipart/form-data
 * Reference: https://publisher.walrus-testnet.walrus.space/v1/api#tag/routes/operation/put_quilt
 * Note: Direct upload may fail due to CORS or service availability
 * Consider using backend proxy for production
 */
export async function uploadToWalrus(
  file: Blob,
  epochs: number = 1
): Promise<WalrusUploadResponse> {
  try {
    // Create FormData for multipart/form-data upload
    const formData = new FormData();
    formData.append('file', file, 'encrypted-report.bin');
    
    const response = await fetch(
      `${WALRUS_PUBLISHER_URL}/v1/quilts?epochs=${epochs}&quilt_version=V1`,
      {
        method: 'PUT',
        body: formData,
        // Don't set Content-Type header manually - let browser set it with correct boundary
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Walrus upload failed:', error);
      throw new Error(`Walrus service returned ${response.status}: ${error || response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('Walrus upload error:', error);
    
    // If CORS or network error, suggest using backend proxy
    if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
      throw new Error('Cannot connect to Walrus directly. Please ensure backend is running or Walrus service is available.');
    }
    
    throw error;
  }
}

/**
 * Download file from Walrus
 * Reference: https://docs.walrus.site/usage/web-api.html#reading-blobs
 */
export async function downloadFromWalrus(blobId: string): Promise<Blob> {
  // Determine endpoints based on ID format
  // Quilt Patch IDs end with base64-encoded metadata (e.g., "BAQASAA")
  const looksLikeQuiltPatchId = blobId.length >= 48 && /[A-Z]{2,}$/.test(blobId);
  
  let endpoints: string[];
  if (looksLikeQuiltPatchId) {
    endpoints = [
      `${WALRUS_AGGREGATOR_URL}/v1/blobs/by-quilt-patch-id/${blobId}`,
      `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`,
    ];
  } else {
    endpoints = [
      `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`,
      `${WALRUS_AGGREGATOR_URL}/v1/blobs/by-quilt-patch-id/${blobId}`,
      `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`,
    ];
  }
  
  let lastError: string = '';
  
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        cache: 'no-cache',
      });
      
      if (response.ok) {
        return await response.blob();
      }
      
      lastError = `${response.status} ${response.statusText}`;
    } catch (error: any) {
      lastError = error.message;
    }
  }
  
  throw new Error(
    `Failed to download from Walrus after trying ${endpoints.length} endpoints. ` +
    `BlobId: ${blobId}, Last error: ${lastError}. ` +
    `The blob might not be available yet (try again in a few seconds) or the blobId might be incorrect.`
  );
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
 * 
 * @param encryptedFile - Encrypted file blob
 * @param epochs - Storage duration (Walrus testnet typically allows 1-5 epochs, 1 epoch ≈ 1 day)
 * @returns Walrus quilt patch ID (for quilts API) or blob ID (for standard API)
 */
export async function uploadEncryptedReport(
  encryptedFile: Blob,
  epochs: number = 1
): Promise<string> {
  const result = await uploadToWalrus(encryptedFile, epochs);
  
  // When using /v1/quilts endpoint, return quiltPatchId for correct download
  // Check for storedQuiltBlobs (Quilts API)
  if (result.storedQuiltBlobs && result.storedQuiltBlobs.length > 0) {
    const firstPatch = result.storedQuiltBlobs[0];
    if (firstPatch.quiltPatchId) {
      return firstPatch.quiltPatchId;
    }
  }
  
  // Fallback: Check for blobStoreResult structure (standard Blob API)
  if (result.blobStoreResult) {
    const blobStore = result.blobStoreResult;
    if (blobStore.newlyCreated) {
      return blobStore.newlyCreated.blobObject.blobId;
    } else if (blobStore.alreadyCertified) {
      return blobStore.alreadyCertified.blobId;
    }
  }
  
  // Legacy fallback
  if (result.newlyCreated) {
    return result.newlyCreated.blobObject.blobId;
  } else if (result.alreadyCertified) {
    return result.alreadyCertified.blobId;
  }
  
  console.error('Unexpected Walrus response:', result);
  throw new Error('Failed to get blob ID or quilt patch ID from upload response');
}

/**
 * Upload JSON data to Walrus
 */
export async function uploadJsonToWalrus(data: any, epochs: number = 1): Promise<string> {
  const jsonString = JSON.stringify(data);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const result = await uploadToWalrus(blob, epochs);
  
  // Reuse the ID extraction logic from uploadEncryptedReport
  // (Ideally this logic should be in a shared helper, but for now we inline or reuse)
  
  // Check for storedQuiltBlobs (Quilts API)
  if (result.storedQuiltBlobs && result.storedQuiltBlobs.length > 0) {
    const firstPatch = result.storedQuiltBlobs[0];
    if (firstPatch.quiltPatchId) {
      return firstPatch.quiltPatchId;
    }
  }
  
  // Fallback: Check for blobStoreResult structure (standard Blob API)
  if (result.blobStoreResult) {
    const blobStore = result.blobStoreResult;
    if (blobStore.newlyCreated) {
      return blobStore.newlyCreated.blobObject.blobId;
    } else if (blobStore.alreadyCertified) {
      return blobStore.alreadyCertified.blobId;
    }
  }
  
  // Legacy fallback
  if (result.newlyCreated) {
    return result.newlyCreated.blobObject.blobId;
  } else if (result.alreadyCertified) {
    return result.alreadyCertified.blobId;
  }
  
  throw new Error('Failed to get blob ID from JSON upload');
}

/**
 * Read JSON content from Walrus
 */
export async function readJsonFromWalrus<T = any>(blobId: string): Promise<T> {
  const blob = await downloadFromWalrus(blobId);
  const text = await blob.text();
  
  if (!text || text.trim().length === 0) {
    throw new Error('Downloaded JSON content is empty');
  }
  
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('Failed to parse JSON from Walrus:', error);
    throw new Error('Invalid JSON format');
  }
}

/**
 * Download and decrypt report from Walrus
 */
export async function downloadEncryptedReport(blobId: string): Promise<Blob> {
  return await downloadFromWalrus(blobId);
}

