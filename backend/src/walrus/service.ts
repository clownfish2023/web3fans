import axios from 'axios';

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
   * Upload content to Walrus using the new /v1/quilt endpoint
   * Reference: https://publisher.walrus-testnet.walrus.space/v1/api#tag/routes/operation/put_quilt
   */
  async upload(content: string, epochs: number = 100): Promise<string> {
    try {
      const response = await axios.put(
        `${this.publisherUrl}/v1/quilt?epochs=${epochs}`,
        content,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        }
      );

      const data = response.data;
      
      // Handle new Walrus API response format
      if (data.newlyCreated) {
        const blobId = data.newlyCreated.blobObject.blobId;
        console.log(`✅ Uploaded to Walrus (newly created): ${blobId}`);
        return blobId;
      } else if (data.alreadyCertified) {
        const blobId = data.alreadyCertified.blobId;
        console.log(`✅ Already in Walrus (certified): ${blobId}`);
        return blobId;
      }

      // Fallback: try to extract blobId from any available field
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
    try {
      const response = await axios.get(
        `${this.aggregatorUrl}/v1/${blobId}`,
        {
          responseType: 'text',
        }
      );

      console.log(`✅ Downloaded from Walrus: ${blobId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to download from Walrus:', error);
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

