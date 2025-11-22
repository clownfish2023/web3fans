import axios from 'axios';
import FormData from 'form-data';

/**
 * Walrus Service for decentralized storage
 */
export class WalrusService {
  private publisherUrl: string;
  private aggregatorUrl: string;

  constructor() {
    this.publisherUrl = process.env.WALRUS_PUBLISHER_URL || 
      'https://publisher.walrus-testnet.walrus.space';
    this.aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || 
      'https://aggregator.walrus-testnet.walrus.space';
  }

  /**
   * Upload content to Walrus using the new /v1/quilts endpoint with multipart/form-data
   * Reference: https://publisher.walrus-testnet.walrus.space/v1/api#tag/routes/operation/put_quilt
   * 
   * @param content - Base64 encoded file content
   * @param epochs - Storage duration (Testnet typically allows 1-5 epochs, 1 epoch ≈ 1 day)
   * @returns Walrus blob ID
   */
  async upload(content: string, epochs: number = 1): Promise<string> {
    try {
      const formData = new FormData();
      
      // Convert base64 content to Buffer
      const buffer = Buffer.from(content, 'base64');
      formData.append('file', buffer, {
        filename: 'encrypted-report.bin',
        contentType: 'application/octet-stream',
      });
      
      const response = await axios.put(
        `${this.publisherUrl}/v1/quilts?epochs=${epochs}&quilt_version=V1`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        }
      );

      const data = response.data;
      
      // Handle new Walrus API response format with blobStoreResult
      if (data.blobStoreResult) {
        const blobStore = data.blobStoreResult;
        
        if (blobStore.newlyCreated) {
          const blobId = blobStore.newlyCreated.blobObject.blobId;
          console.log(`✅ Uploaded to Walrus (newly created): ${blobId}`);
          return blobId;
        } else if (blobStore.alreadyCertified) {
          const blobId = blobStore.alreadyCertified.blobId;
          console.log(`✅ Already in Walrus (certified): ${blobId}`);
          return blobId;
        }
      }
      
      // Fallback: check old structure
      if (data.newlyCreated) {
        const blobId = data.newlyCreated.blobObject.blobId;
        console.log(`✅ Uploaded to Walrus (newly created): ${blobId}`);
        return blobId;
      } else if (data.alreadyCertified) {
        const blobId = data.alreadyCertified.blobId;
        console.log(`✅ Already in Walrus (certified): ${blobId}`);
        return blobId;
      }

      // Last resort: try to extract blobId from any available field
      const blobId = data.blobId || data.id;
      if (blobId) {
        console.log(`✅ Uploaded to Walrus: ${blobId}`);
        return blobId;
      }

      console.error('Unexpected Walrus response:', data);
      throw new Error('Failed to get blob ID from response');
    } catch (error: any) {
      console.error('Failed to upload to Walrus:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Download content from Walrus
   */
  async download(blobId: string): Promise<string> {
    // Try multiple endpoints to handle different ID types (Blob ID vs Quilt Patch ID)
    const endpoints = [
      `${this.aggregatorUrl}/v1/${blobId}`,
      `${this.aggregatorUrl}/v1/blobs/${blobId}`,
      // If it's a Quilt Patch ID, this endpoint is required
      `${this.aggregatorUrl}/v1/blobs/by-quilt-patch-id/${blobId}`
    ];

    let lastError: any = null;

    for (const url of endpoints) {
      try {
        // console.log(`[DEBUG] Trying Walrus endpoint: ${url}`);
        const response = await axios.get(url, { responseType: 'text' });
        
        console.log(`✅ Downloaded from Walrus: ${blobId}`);
        console.log(`[DEBUG] Response headers:`, response.headers);
        console.log(`[DEBUG] Response status:`, response.status);
        console.log(`[DEBUG] Response data length:`, response.data ? response.data.length : 0);
        
        return response.data;
      } catch (error: any) {
        lastError = error;
        // If 404, it might be the wrong endpoint type, so continue to next
        if (error.response && error.response.status === 404) {
          continue;
        }
        // For other errors (500, network), maybe still try others but log it
        // console.warn(`Endpoint failed: ${url}, error: ${error.message}`);
      }
    }

    // If we get here, all endpoints failed
    console.error(`Failed to download from Walrus after trying all endpoints for ID: ${blobId}`);
    if (lastError) throw lastError;
    throw new Error('Walrus download failed');
  }

  /**
   * Read JSON content from Walrus
   */
  async readJson<T = any>(blobId: string): Promise<T> {
    try {
      const content = await this.download(blobId);
      
      // Handle empty content (sometimes Walrus returns 200 OK but empty body during propagation)
      if (!content || (typeof content === 'string' && content.trim().length === 0)) {
        console.warn(`[DEBUG] Downloaded content is empty for ID: ${blobId}`);
        throw new Error('Downloaded content is empty');
      }

      // If axios automatically parsed JSON
      if (typeof content === 'object') return content as T;
      
      try {
        return JSON.parse(content) as T;
      } catch (parseError) {
        console.error(`[DEBUG] Failed to parse content: "${content.substring(0, 100)}..."`);
        throw parseError;
      }
    } catch (error) {
      console.error('Failed to read/parse JSON from Walrus:', error);
      throw error;
    }
  }

  /**
   * Get blob info
   */
  async getBlobInfo(blobId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.aggregatorUrl}/v1/${blobId}/info`
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get blob info:', error);
      throw error;
    }
  }
}

