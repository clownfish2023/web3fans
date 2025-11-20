import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, MODULE_NAME, FUNCTIONS } from '@/config/constants';
import { suiToMist } from '@/utils/sui';
import { useState } from 'react';

export function useContract() {
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Create a new group
   */
  const createGroup = async (
    name: string,
    description: string,
    subscriptionFeeSui: number,
    subscriptionPeriod: number,
    maxMembers: number,
    telegramGroupId: string,
    telegramInviteLink: string,
    clockId: string = '0x6'
  ) => {
    if (!currentAccount) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    try {
      const tx = new Transaction();
      
      const subscriptionFee = suiToMist(subscriptionFeeSui);
      
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTIONS.CREATE_GROUP}`,
        arguments: [
          tx.pure.string(name),
          tx.pure.string(description),
          tx.pure.u64(subscriptionFee),
          tx.pure.u64(subscriptionPeriod),
          tx.pure.u64(maxMembers),
          tx.pure.string(telegramGroupId),
          tx.pure.string(telegramInviteLink),
          tx.object(clockId),
        ],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    } catch (error) {
      console.error('Create group error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Subscribe to a group
   */
  const subscribe = async (
    groupId: string,
    subscriptionFeeSui: number,
    telegramId: string,
    clockId: string = '0x6'
  ) => {
    if (!currentAccount) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    try {
      const tx = new Transaction();
      
      const subscriptionFee = suiToMist(subscriptionFeeSui);
      
      // Split coin for payment
      const [coin] = tx.splitCoins(tx.gas, [subscriptionFee]);
      
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTIONS.SUBSCRIBE}`,
        arguments: [
          tx.object(groupId),
          coin,
          tx.pure.string(telegramId),
          tx.object(clockId),
        ],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    } catch (error) {
      console.error('Subscribe error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Publish a report
   */
  const publishReport = async (
    groupId: string,
    adminCapId: string,
    title: string,
    summary: string,
    walrusBlobId: string,
    sealKeyId: number[],
    clockId: string = '0x6'
  ) => {
    if (!currentAccount) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTIONS.PUBLISH_REPORT}`,
        arguments: [
          tx.object(groupId),
          tx.object(adminCapId),
          tx.pure.string(title),
          tx.pure.string(summary),
          tx.pure.string(walrusBlobId),
          tx.pure(new Uint8Array(sealKeyId)),
          tx.object(clockId),
        ],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify subscription access (seal approve)
   */
  const verifyAccess = async (
    keyId: number[],
    subscriptionId: string,
    groupId: string,
    packageVersionId: string,
    clockId: string = '0x6'
  ) => {
    if (!currentAccount) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTIONS.SEAL_APPROVE}`,
        arguments: [
          tx.pure(new Uint8Array(keyId)),
          tx.object(subscriptionId),
          tx.object(groupId),
          tx.object(clockId),
          tx.object(packageVersionId),
        ],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get group object
   */
  const getGroup = async (groupId: string) => {
    const object = await client.getObject({
      id: groupId,
      options: {
        showContent: true,
      },
    });
    return object;
  };

  /**
   * Get subscription object
   */
  const getSubscription = async (subscriptionId: string) => {
    const object = await client.getObject({
      id: subscriptionId,
      options: {
        showContent: true,
      },
    });
    return object;
  };

  /**
   * Get report object
   */
  const getReport = async (reportId: string) => {
    const object = await client.getObject({
      id: reportId,
      options: {
        showContent: true,
      },
    });
    return object;
  };

  /**
   * Get all groups
   */
  const getAllGroups = async () => {
    // Query all Group objects
    const result = await client.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::GroupCreated`,
      },
    });
    
    return result.data;
  };

  /**
   * Get user's subscriptions
   */
  const getUserSubscriptions = async (address: string) => {
    const objects = await client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${PACKAGE_ID}::${MODULE_NAME}::Subscription`,
      },
      options: {
        showContent: true,
      },
    });
    
    return objects.data;
  };

  /**
   * Get user's admin caps (groups they own)
   */
  const getUserAdminCaps = async (address: string) => {
    const objects = await client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${PACKAGE_ID}::${MODULE_NAME}::GroupAdminCap`,
      },
      options: {
        showContent: true,
      },
    });
    
    return objects.data;
  };

  return {
    createGroup,
    subscribe,
    publishReport,
    verifyAccess,
    getGroup,
    getSubscription,
    getReport,
    getAllGroups,
    getUserSubscriptions,
    getUserAdminCaps,
    isLoading,
  };
}

