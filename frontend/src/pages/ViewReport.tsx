import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { Report } from '@/types';
import { retrieveKeyFromSeal, decryptFile } from '@/utils/encryption';
import { downloadFromWalrus, readJsonFromWalrus } from '@/services/walrus';
import { API_URL } from '@/config/constants';
import { message } from 'antd';
import { ArrowLeft, Lock, FileText, Download, Eye, Share2, Copy, Send } from 'lucide-react';

export function ViewReport() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();
  
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedBlob, setDecryptedBlob] = useState<Blob | null>(null);
  const [accessKeyId, setAccessKeyId] = useState<string>('');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<number | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    if (reportId && currentAccount) {
      loadReport();
      findAccessKey();
    }
  }, [reportId, currentAccount]);

  const loadReport = async () => {
    if (!reportId) return;
    setLoading(true);
    
    try {
      // Strategy: Try to treat reportId as a Walrus Manifest ID first.
      // Walrus IDs are typically base64 strings (often ~44 chars or longer), while Sui Object IDs are 0x + 64 hex chars.
      // Simple heuristic: If it doesn't start with 0x, assume it's a Walrus ID.
      const isWalrusId = !reportId.startsWith('0x');
      
      if (isWalrusId) {
        try {
          console.log('Fetching report manifest from Walrus:', reportId);
          const manifest = await readJsonFromWalrus<any>(reportId);
          
          if (manifest && manifest.title) {
            console.log('✅ Loaded report from Walrus Manifest:', manifest);
            
            setReport({
              id: reportId,
              groupId: manifest.groupId || 'unknown', // Handle legacy manifests
              title: manifest.title,
              summary: manifest.summary,
              walrusBlobId: manifest.contentBlobId,
              sealKeyId: manifest.sealKeyId, // Handle legacy manifests
              publisher: '0x...', // Manifest usually doesn't contain publisher address
              publishedAt: manifest.publishDate ? new Date(manifest.publishDate).getTime() : Date.now(),
            });
            setLoading(false);
            return;
          }
        } catch (walrusError) {
          console.warn('Failed to load as Walrus Manifest, falling back to chain lookup:', walrusError);
          // Continue to chain lookup fallback
        }
      }

      // Fallback: Load from Sui Chain (as Object ID)
      const result = await client.getObject({
        id: reportId,
        options: {
          showContent: true,
        },
      });
      
      if (result.data?.content && 'fields' in result.data.content) {
        const fields = result.data.content.fields as any;
        const reportData = {
          id: reportId,
          groupId: fields.group_id,
          title: fields.title,
          summary: fields.summary,
          walrusBlobId: fields.walrus_blob_id,
          sealKeyId: fields.seal_key_id,
          publisher: fields.publisher,
          publishedAt: parseInt(fields.published_at),
        };
        
        console.log('✅ Loaded report from Chain:', {
          id: reportData.id,
          walrusBlobId: reportData.walrusBlobId,
        });
        
        setReport(reportData);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      message.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const findAccessKey = async () => {
    if (!currentAccount || !report) return;
    
    console.log('🔍 Checking subscription for Group ID:', report.groupId);
    
    try {
      let hasNextPage = true;
      let nextCursor = null;
      let foundKey = null;

      // Pagination loop to find AccessKey
      while (hasNextPage && !foundKey) {
        const response: any = await client.getOwnedObjects({
          owner: currentAccount.address,
          cursor: nextCursor,
          options: {
            showContent: true,
            showType: true,
          },
        });

        const accessKey = response.data.find((obj: any) => {
          const fields = obj.data?.content?.fields;
          if (!fields) return false;
          
          // Simple heuristic: check if it has group_id field
          const objGroupId = fields.group_id;
          if (!objGroupId) return false;

          // Normalize IDs for comparison
          return normalizeSuiObjectId(objGroupId) === normalizeSuiObjectId(report.groupId);
        });

        if (accessKey) {
          foundKey = accessKey;
        }

        hasNextPage = response.hasNextPage;
        nextCursor = response.nextCursor;
      }
      
      if (foundKey && foundKey.data) {
        console.log('✅ Found valid AccessKey:', foundKey.data.objectId);
        setAccessKeyId(foundKey.data.objectId);
        
        // Get expiry time from AccessKey
        if (foundKey.data.content && 'fields' in foundKey.data.content) {
          const fields = foundKey.data.content.fields as any;
          if (fields.expires_at) {
            const expiresAt = parseInt(fields.expires_at);
            setSubscriptionExpiry(expiresAt);
          }
        }
      } else {
        console.log('❌ No active subscription found for this group.');
      }
    } catch (error) {
      console.error('Failed to find access key:', error);
    }
  };

  const handleDecryptAndView = async () => {
    if (!report || !accessKeyId) {
      message.error('No valid access key found. Please subscribe to this group first.');
      return;
    }

    // Check if subscription is still valid
    if (subscriptionExpiry && subscriptionExpiry <= Date.now()) {
      message.error({
        content: 'Your subscription has expired. Please renew your subscription to access this report.',
        duration: 5,
      });
      // Navigate back to group page for renewal
      setTimeout(() => {
        navigate(`/groups/${report.groupId}`);
      }, 2000);
      return;
    }

    try {
      setDecrypting(true);
      message.loading({ content: 'Decrypting report...', key: 'decrypt', duration: 0 });
      
      // Step 1: Download encrypted file from Walrus
      message.loading({ 
        content: 'Downloading from Walrus...', 
        key: 'decrypt', 
        duration: 0 
      });
      
      const encryptedBlob = await downloadFromWalrus(report.walrusBlobId);
      
      // Step 2: Retrieve decryption key from Seal
      message.loading({ content: 'Retrieving decryption key...', key: 'decrypt', duration: 0 });
      const keyId = new Uint8Array(report.sealKeyId);
      const encryptionKey = await retrieveKeyFromSeal(keyId, accessKeyId, API_URL);
      
      // Step 3: Decrypt the file
      message.loading({ content: 'Decrypting content...', key: 'decrypt', duration: 0 });
      const decrypted = await decryptFile(encryptedBlob, encryptionKey);
      
      setDecryptedBlob(decrypted);
      message.success({ content: 'Report decrypted successfully!', key: 'decrypt', duration: 2 });
    } catch (error: any) {
      
      let errorMessage = 'Failed to decrypt report';
      
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        errorMessage = 'File not found on Walrus. The blob might not be synced yet. Please try again in a few seconds.';
      } else if (error.message.includes('Failed to download')) {
        errorMessage = `Download failed: ${error.message}. Check console for details.`;
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      message.error({ 
        content: errorMessage, 
        key: 'decrypt',
        duration: 8 
      });
    } finally {
      setDecrypting(false);
    }
  };

  const handleDownload = () => {
    if (!decryptedBlob || !report) return;
    
    const url = URL.createObjectURL(decryptedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    message.success('Download started!');
  };

  const getReportUrl = () => {
    return `${window.location.origin}/reports/${reportId}`;
  };

  const handleCopyLink = () => {
    const url = getReportUrl();
    navigator.clipboard.writeText(url);
    message.success('Link copied to clipboard!');
    setShowShareMenu(false);
  };

  const handleShareToTelegram = () => {
    if (!report) return;
    
    const url = getReportUrl();
    const text = `📊 ${report.title}\n\n${report.summary}\n\n👉 View full report (subscription required):`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    
    window.open(telegramUrl, '_blank');
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Report not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{report.title}</h1>
              <p className="text-gray-600 mb-4">{report.summary}</p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left inline-block max-w-xl">
                <h3 className="text-sm font-bold text-yellow-800 flex items-center">
                  ⚠️ Legacy Report Format
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This report was published using an older version of the protocol and lacks the necessary metadata (Group ID / Key ID) for decryption.
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  Please publish a new report to test the full functionality.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      </div>

      {/* Report Info - Public (Anyone can view) */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{report.title}</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Free Preview
              </span>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed">{report.summary}</p>
          </div>
          <FileText className="w-12 h-12 text-primary-600 ml-4 flex-shrink-0" />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-500">Published At</p>
            <p className="text-gray-900">
              {new Date(report.publishedAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Stored on Walrus</p>
            <p className="text-xs text-gray-600 font-mono">
              {report.walrusBlobId.substring(0, 20)}...
            </p>
          </div>
          
          {/* Share Button */}
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
            
            {showShareMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                >
                  <Copy className="w-4 h-4 mr-3 text-gray-600" />
                  <span className="text-sm text-gray-700">Copy Link</span>
                </button>
                <button
                  onClick={handleShareToTelegram}
                  className="w-full flex items-center px-4 py-3 hover:bg-gray-50 text-left transition-colors border-t border-gray-100"
                >
                  <Send className="w-4 h-4 mr-3 text-blue-500" />
                  <span className="text-sm text-gray-700">Share to Telegram</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decryption Section */}
      {!decryptedBlob ? (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <Lock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Encrypted Content
            </h2>
            <p className="text-gray-600 mb-6">
              This report is encrypted and stored on Walrus. Click the button below to decrypt and view the full content.
            </p>
            
            {/* Subscription Status */}
            {subscriptionExpiry && (
              <div className={`mb-6 p-4 rounded-lg ${
                subscriptionExpiry > Date.now() 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm font-medium ${
                  subscriptionExpiry > Date.now() 
                    ? 'text-green-800' 
                    : 'text-red-800'
                }`}>
                  {subscriptionExpiry > Date.now() ? (
                    <>
                      ✓ Subscription Active - Expires on {new Date(subscriptionExpiry).toLocaleString()}
                    </>
                  ) : (
                    <>
                      ⚠️ Subscription Expired on {new Date(subscriptionExpiry).toLocaleString()}
                    </>
                  )}
                </p>
              </div>
            )}
            
            {accessKeyId ? (
              <button
                onClick={handleDecryptAndView}
                disabled={decrypting}
                className="flex items-center justify-center px-8 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
              >
                {decrypting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 mr-2" />
                    Decrypt & View Report
                  </>
                )}
              </button>
            ) : report.groupId === 'unknown' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  ⚠️ Legacy Report Format
                </h3>
                <p className="text-yellow-800 mb-4">
                  This report lacks the necessary metadata (Group ID) for decryption and subscription.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  🔒 Subscription Required
                </h3>
                <p className="text-yellow-800 mb-4">
                  To view the full encrypted report, you need to subscribe to this research group.
                </p>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">✓ You can currently see:</p>
                  <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                    <li>Report title and summary (above)</li>
                    <li>Publication date</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-3 mb-2">🔐 After subscribing, you'll access:</p>
                  <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                    <li>Full encrypted report content</li>
                    <li>Downloadable files</li>
                    <li>All future reports during subscription period</li>
                  </ul>
                </div>
                <button
                  onClick={() => navigate(`/groups/${report.groupId}`)}
                  className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  View Group & Subscribe
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">🔐 How it works</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Report is encrypted using Seal (AES-256-GCM)</li>
              <li>Encrypted file is stored on Walrus (decentralized storage)</li>
              <li>Your AccessKey NFT verifies your subscription</li>
              <li>Decryption key is retrieved from Seal service</li>
              <li>File is decrypted locally in your browser</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ✅ Report Decrypted
            </h2>
            <p className="text-gray-600">
              The report has been decrypted successfully. You can now download it.
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleDownload}
              className="flex items-center px-8 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Report
            </button>
            <button
              onClick={() => setDecryptedBlob(null)}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>File Size:</strong> {(decryptedBlob.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Type:</strong> {decryptedBlob.type || 'application/octet-stream'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

