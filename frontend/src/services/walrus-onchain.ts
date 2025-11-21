/**
 * Walrus On-Chain Service
 * Uses Sui blockchain transactions to store files with user wallet payment
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

// Walrus System Package on Sui Testnet
// Reference: https://docs.walrus.site/usage/web-api.html
// Note: These values need to be updated with actual Walrus testnet deployment
const WALRUS_SYSTEM_PACKAGE = import.meta.env.VITE_WALRUS_PACKAGE_ID || '0xTBD'; // Update from Walrus docs
const WALRUS_SYSTEM_MODULE = 'system';
const WALRUS_STORE_FUNCTION = 'store';

// Walrus System State Object (shared object that manages the Walrus network)
const WALRUS_SYSTEM_OBJECT = import.meta.env.VITE_WALRUS_SYSTEM_OBJECT || '0xTBD'; // Update from Walrus docs

// Storage configuration
const STORAGE_NODE_OBJECT = import.meta.env.VITE_WALRUS_STORAGE_NODE || '0xTBD'; // Storage node registry

export interface WalrusStoreResult {
  blobId: string;
  cost: string;
  endEpoch: number;
}

/**
 * Create a Sui transaction to store file on Walrus
 * User needs to sign and execute this transaction with their wallet
 * 
 * @param content - File content as Uint8Array
 * @param epochs - Number of epochs to store (1 epoch ≈ 1 day)
 * @returns Transaction object ready to be signed by user wallet
 */
export function createWalrusStoreTransaction(
  content: Uint8Array,
  epochs: number = 100
): Transaction {
  const tx = new Transaction();
  
  // Estimate storage cost and split coin for payment
  const estimatedCost = estimateWalrusStorageCost(content.length, epochs);
  const [paymentCoin] = tx.splitCoins(tx.gas, [estimatedCost]);
  
  // Call Walrus System contract's store function
  // This will store the file and emit an event with the blob ID
  tx.moveCall({
    target: `${WALRUS_SYSTEM_PACKAGE}::${WALRUS_SYSTEM_MODULE}::${WALRUS_STORE_FUNCTION}`,
    arguments: [
      tx.object(WALRUS_SYSTEM_OBJECT), // Walrus system state object
      tx.object(STORAGE_NODE_OBJECT), // Storage node registry
      tx.pure.vector('u8', Array.from(content)), // File content as bytes
      tx.pure.u64(epochs), // Storage duration in epochs
      paymentCoin, // Payment for storage
    ],
  });
  
  return tx;
}

/**
 * Extract blob ID from transaction result
 * 
 * @param txResult - Transaction execution result from wallet
 * @returns Blob ID string
 */
export function extractBlobIdFromTxResult(txResult: any): string {
  console.log('🔍 Extracting blob ID from transaction result:', txResult);
  
  // Method 1: Look for Walrus store event
  const events = txResult.events || [];
  for (const event of events) {
    if (event.type && (
      event.type.includes('::BlobRegistered') ||
      event.type.includes('::StoreEvent') ||
      event.type.includes('system::Store')
    )) {
      const blobId = event.parsedJson?.blob_id 
                  || event.parsedJson?.blobId
                  || event.parsedJson?.id;
      if (blobId) {
        console.log('✅ Found blob ID in event:', blobId);
        return blobId;
      }
    }
  }
  
  // Method 2: Look in created objects
  const created = txResult.effects?.created || [];
  for (const obj of created) {
    const reference = obj.reference || obj;
    const objectType = reference.objectType || obj.objectType;
    
    if (objectType && (
      objectType.includes('Blob') ||
      objectType.includes('BlobObject')
    )) {
      const blobId = reference.objectId || obj.objectId;
      if (blobId) {
        console.log('✅ Found blob ID in created objects:', blobId);
        return blobId;
      }
    }
  }
  
  // Method 3: Look in object changes
  const objectChanges = txResult.objectChanges || [];
  for (const change of objectChanges) {
    if (change.type === 'created' && 
        change.objectType && 
        change.objectType.includes('Blob')) {
      const blobId = change.objectId;
      if (blobId) {
        console.log('✅ Found blob ID in object changes:', blobId);
        return blobId;
      }
    }
  }
  
  console.error('❌ Failed to extract blob ID. Transaction result:', JSON.stringify(txResult, null, 2));
  throw new Error('Failed to extract blob ID from transaction result. Please check transaction events.');
}

/**
 * Estimate storage cost (for display to user before transaction)
 * 
 * Note: This is an approximation. Actual cost is determined by Walrus protocol.
 * The real cost depends on:
 * - File size (larger files cost more)
 * - Storage duration (more epochs = higher cost)
 * - Current network pricing
 * 
 * @param sizeBytes - File size in bytes
 * @param epochs - Number of storage epochs
 * @returns Estimated cost in MIST (1 SUI = 1,000,000,000 MIST)
 */
export function estimateWalrusStorageCost(
  sizeBytes: number,
  epochs: number
): bigint {
  // Base cost formula (approximate):
  // Cost = (size_in_KB * epochs * base_rate) + fixed_fee
  
  const sizeKB = Math.ceil(sizeBytes / 1024);
  
  // Base rate: ~1000 MIST per KB per epoch (adjust based on Walrus docs)
  const baseRate = BigInt(1000);
  const baseCost = BigInt(sizeKB) * BigInt(epochs) * baseRate;
  
  // Fixed registration fee: ~10,000 MIST
  const registrationFee = BigInt(10_000);
  
  // Total with 50% buffer for safety (network conditions may vary)
  const totalCost = (baseCost + registrationFee) * BigInt(150) / BigInt(100);
  
  return totalCost;
}

/**
 * Format cost for display
 */
export function formatStorageCost(costMist: bigint): string {
  const sui = Number(costMist) / 1_000_000_000;
  return `${sui.toFixed(4)} SUI`;
}

/**
 * Check if user has sufficient balance for storage
 */
export async function checkSufficientBalance(
  client: SuiClient,
  userAddress: string,
  requiredCost: bigint
): Promise<{ sufficient: boolean; currentBalance: bigint }> {
  const balance = await client.getBalance({
    owner: userAddress,
    coinType: '0x2::sui::SUI',
  });
  
  const currentBalance = BigInt(balance.totalBalance);
  
  return {
    sufficient: currentBalance >= requiredCost,
    currentBalance,
  };
}

/**
 * Download file from Walrus (still using HTTP API - reading is free)
 */
export async function downloadFromWalrus(blobId: string): Promise<Blob> {
  const aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
  
  const response = await fetch(`${aggregatorUrl}/v1/blobs/${blobId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to download from Walrus: ${response.statusText}`);
  }
  
  return await response.blob();
}

/**
 * Get blob info (metadata)
 */
export async function getBlobInfo(
  client: SuiClient,
  blobId: string
): Promise<any> {
  // Query Walrus system for blob metadata
  // This requires the blob to be stored as a Sui object
  
  try {
    const obj = await client.getObject({
      id: blobId,
      options: {
        showContent: true,
        showType: true,
      },
    });
    
    return obj.data;
  } catch (error) {
    console.error('Failed to get blob info:', error);
    return null;
  }
}

