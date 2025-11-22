import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useContract } from '@/hooks/useContract';
import { useTelegram } from '@/hooks/useTelegram';
import { Group } from '@/types';
import { encryptFile, storeKeyInSeal } from '@/utils/encryption';
import { uploadEncryptedReport, uploadJsonToWalrus } from '@/services/walrus';
import { API_URL } from '@/config/constants';
import { message } from 'antd';
import { ArrowLeft, Upload, FileText, Lock } from 'lucide-react';
import axios from 'axios';

export function PublishReport() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const { getGroup, getUserAdminCaps, publishReport, isLoading } = useContract();
  const { sendTelegramNotification } = useTelegram();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [adminCapId, setAdminCapId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    contentFile: null as File | null,
  });
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (groupId && currentAccount) {
      loadGroup();
      loadAdminCap();
    }
  }, [groupId, currentAccount]);

  const loadGroup = async () => {
    if (!groupId) return;
    
    try {
      const result = await getGroup(groupId);
      
      if (result.data?.content && 'fields' in result.data.content) {
        const fields = result.data.content.fields as any;
        const groupData: Group = {
          id: groupId,
          name: fields.name,
          description: fields.description,
          owner: fields.owner,
          subscriptionFee: fields.subscription_fee,
          subscriptionPeriod: parseInt(fields.subscription_period),
          maxMembers: parseInt(fields.max_members),
          currentMembers: parseInt(fields.current_members),
          telegramGroupId: fields.telegram_group_id,
          telegramInviteLink: fields.telegram_invite_link,
          reportCount: parseInt(fields.report_count),
          createdAt: parseInt(fields.created_at),
        };
        
        setGroup(groupData);

        // Check if current user is the owner
        if (currentAccount && currentAccount.address !== fields.owner) {
          message.error('Only group owner can publish reports');
          navigate(`/groups/${groupId}`);
        }
      }
    } catch (error) {
      console.error('Failed to load group:', error);
      message.error('Failed to load group information');
    }
  };

  const loadAdminCap = async () => {
    if (!currentAccount || !groupId) return;
    
    try {
      const adminCaps = await getUserAdminCaps(currentAccount.address);
      
      // Find the admin cap for this group
      const matchingCap = adminCaps.find((cap: any) => {
        const fields = cap.data?.content?.fields;
        return fields?.group_id === groupId;
      });
      
      if (matchingCap && matchingCap.data) {
        setAdminCapId(matchingCap.data.objectId);
      } else {
        message.error('GroupAdminCap not found. You need the admin capability to publish reports.');
        navigate(`/groups/${groupId}`);
      }
    } catch (error) {
      console.error('Failed to load admin cap:', error);
      message.error('Failed to load admin capability');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (max 10MB for demo)
      if (file.size > 10 * 1024 * 1024) {
        message.error('File size must be less than 10MB');
        return;
      }
      
      setFormData({ ...formData, contentFile: file });
    }
  };

  const uploadToWalrus = async (file: File): Promise<{ contentBlobId: string; manifestBlobId: string; sealKeyId: number[] }> => {
    try {
      // Step 1: Encrypt file (10%)
      setUploadProgress(10);
      message.loading({ content: 'Encrypting file with Seal...', key: 'upload', duration: 0 });
      
      const encryptedData = await encryptFile(file, groupId!);
      
      // Step 2: Upload Content to Walrus (30% - 50%)
      setUploadProgress(30);
      message.loading({ content: 'Uploading encrypted content to Walrus...', key: 'upload', duration: 0 });
      
      const contentBlobId = await uploadEncryptedReport(encryptedData.encryptedBlob, 1);
      setUploadProgress(50);
      
      // Step 3: Upload Manifest to Walrus (50% - 70%)
      message.loading({ content: 'Uploading manifest to Walrus...', key: 'upload', duration: 0 });
      
      const manifest = {
        title: formData.title,
        summary: formData.summary,
        imageUrl: 'https://assets.staticimg.com/cms/media/3gLd055qS5548F2W7JQ736.jpg', // Placeholder image
        contentBlobId: contentBlobId,
        publishDate: new Date().toISOString(),
      };
      
      const manifestBlobId = await uploadJsonToWalrus(manifest, 1);
      setUploadProgress(70);

      // Step 4: Store encryption key in Seal service (90%)
      message.loading({ content: 'Storing encryption key...', key: 'upload', duration: 0 });
      
      await storeKeyInSeal(encryptedData.keyId, encryptedData.encryptionKey, API_URL);
      setUploadProgress(90);
      
      // Step 5: Done (100%)
      setUploadProgress(100);
      message.destroy('upload');
      
      return {
        contentBlobId,
        manifestBlobId,
        sealKeyId: Array.from(encryptedData.keyId),
      };
    } catch (error: any) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentAccount || !group || !groupId || !adminCapId) {
      message.error('Please connect wallet and ensure group is loaded');
      return;
    }

    if (!formData.title || !formData.summary || !formData.contentFile) {
      message.error('Please fill in all required fields');
      return;
    }

    try {
      // Step 1: Upload file to Walrus (Content + Manifest)
      const { contentBlobId, manifestBlobId, sealKeyId } = await uploadToWalrus(formData.contentFile);
      
      // Step 2: Publish report on-chain
      message.loading({ content: 'Publishing report on-chain...', key: 'publish', duration: 0 });
      
      const result = await publishReport(
        groupId,
        adminCapId,
        formData.title,
        formData.summary,
        contentBlobId, // We store the Content Blob ID on-chain for decryption access
        sealKeyId
      );

      console.log('Transaction Result:', result);

      // Extract Report object ID from transaction result
      let reportId = 'unknown';
      if (result && typeof result === 'object' && 'effects' in result) {
        const effects = result.effects as any;
        if (effects?.created?.[0]?.reference?.objectId) {
          reportId = effects.created[0].reference.objectId;
        }
      }
      
      console.log('Extracted Report ID:', reportId);
      
      // Step 3: Notify Backend to trigger Telegram Push (using Manifest ID)
      // Even if we can't parse reportId, if the transaction succeeded (didn't throw), we should try to push.
      try {
           console.log(`Sending notification to backend: ${API_URL}/reports/publish`, { manifestBlobId });
           message.loading({ content: 'Sending notification to Telegram...', key: 'notify', duration: 0 });
           
           const response = await axios.post(`${API_URL}/reports/publish`, { 
             manifestBlobId 
           });
           
           console.log('Backend response:', response.data);
           message.success({ content: 'Notification sent to Telegram!', key: 'notify', duration: 3 });
      } catch (notifyError) {
           console.error('Failed to trigger backend notification:', notifyError);
           message.warning({ content: 'Report published, but Telegram notification failed.', key: 'notify', duration: 4 });
      }

      message.success({ content: 'Report published successfully! 🎉', key: 'publish', duration: 3 });
      
      // Reset progress
      setUploadProgress(0);
      
      // Navigate back to group detail
      setTimeout(() => {
        navigate(`/groups/${groupId}`);
      }, 1500);
    } catch (error: any) {
      console.error('Failed to publish report:', error);
      message.error({ 
        content: `Failed to publish report: ${error.message || 'Unknown error'}`, 
        key: 'publish',
        duration: 5 
      });
      setUploadProgress(0);
    }
  };

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Group
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Publish Report</h1>
        <p className="text-gray-600 mt-2">
          Group: {group.name}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="e.g., DeFi Protocol Analysis - November 2024"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Summary (Public) *
          </label>
          <textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Write a brief summary that will be visible to everyone. Subscribers can view the full report."
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            💡 This summary will be visible to all users. Only subscribers can access the full report.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Report Content (Encrypted) *
          </label>
          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
            <div className="space-y-2 text-center">
              <div className="flex justify-center">
                {formData.contentFile ? (
                  <FileText className="h-12 w-12 text-primary-600" />
                ) : (
                  <Upload className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                  <span>{formData.contentFile ? 'Change file' : 'Upload a file'}</span>
                  <input
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.md"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF, DOC, DOCX, TXT, or MD up to 10MB
              </p>
              {formData.contentFile && (
                <div className="mt-2 text-sm text-gray-900">
                  <p className="font-medium">Selected: {formData.contentFile.name}</p>
                  <p className="text-gray-500">
                    Size: {(formData.contentFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-start">
            <Lock className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              The full report will be encrypted and stored on Walrus. Only subscribers with valid access keys can decrypt and view it.
            </p>
          </div>
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Uploading to Walrus...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isLoading || !formData.title || !formData.summary || !formData.contentFile}
              className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Publishing...' : 'Publish Report'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/groups/${groupId}`)}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">📝 Publishing Process</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Report content will be encrypted using Seal</li>
            <li>Encrypted file will be stored on Walrus (decentralized storage)</li>
            <li>Metadata will be recorded on Sui blockchain</li>
            <li>Only valid subscribers can access and decrypt the full report</li>
          </ol>
          <p className="text-sm text-blue-700 mt-3">
            💡 Want to use your wallet to pay for storage? Try <a href={`/groups/${groupId}/publish-onchain`} className="underline font-medium">On-Chain Upload</a>.
          </p>
        </div>
      </form>
    </div>
  );
}

