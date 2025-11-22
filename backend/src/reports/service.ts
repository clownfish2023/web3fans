import { WalrusService } from '../walrus/service.js';

const walrusService = new WalrusService();

export interface ReportManifest {
  title: string;
  summary: string;
  imageUrl: string;
  contentBlobId: string;
  publishDate: string;
}

export class ReportService {
  /**
   * Fetch report manifest (metadata) from Walrus with retries
   * @param manifestBlobId - The Blob ID of the JSON manifest
   * @param retries - Number of retries (default: 5)
   * @param delayMs - Delay between retries in ms (default: 2000)
   */
  async getReportMetadata(manifestBlobId: string, retries = 30, delayMs = 2000): Promise<ReportManifest | null> {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[Attempt ${i + 1}/${retries}] Fetching report manifest for ID: ${manifestBlobId}`);
        const manifest = await walrusService.readJson<ReportManifest>(manifestBlobId);
        if (manifest) return manifest;
      } catch (error: any) {
        console.warn(`[Attempt ${i + 1}/${retries}] Failed to fetch manifest: ${error.message}`);
        
        // Check if it's a 404/NotFound error vs other errors
        // If it's a 404, waiting might help (propagation).
        
        if (i < retries - 1) {
          console.log(`Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    console.error(`Final failure: Could not fetch manifest ${manifestBlobId} after ${retries} attempts.`);
    return null;
  }
}

export const reportService = new ReportService();
