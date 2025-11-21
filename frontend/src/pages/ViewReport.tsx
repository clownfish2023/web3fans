import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Report } from '@/types';
import { retrieveKeyFromSeal, decryptFile } from '@/utils/encryption';
import { downloadFromWalrus } from '@/services/walrus';
import { API_URL } from '@/config/constants';
import { message } from 'antd';
import { ArrowLeft, Lock, FileText, Download, Eye } from 'lucide-react';

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

  useEffect(() => {
    if (reportId && currentAccount) {
      loadReport();
      findAccessKey();
    }
  }, [reportId, currentAccount]);

  const loadReport = async () => {
    if (!reportId) return;
    
    try {
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
        
        console.log('✅ Loaded report:', {
          id: reportData.id,
          walrusBlobId: reportData.walrusBlobId,
          walrusBlobIdLength: reportData.walrusBlobId?.length,
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
    if (!currentAccount) return;
    
    try {
      // Find user's AccessKey NFTs
      const objects = await client.getOwnedObjects({
        owner: currentAccount.address,
        options: {
          showContent: true,
        },
      });
      
      // Find matching AccessKey for this report's group
      const accessKey = objects.data.find((obj: any) => {
        const fields = obj.data?.content?.fields;
        return fields && fields.group_id === report?.groupId;
      });
      
      if (accessKey && accessKey.data) {
        setAccessKeyId(accessKey.data.objectId);
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

      {/* Report Info */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{report.title}</h1>
            <p className="text-gray-600">{report.summary}</p>
          </div>
          <FileText className="w-12 h-12 text-primary-600 ml-4" />
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
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">
                  ❌ No valid access key found. Please subscribe to this group first.
                </p>
                <button
                  onClick={() => navigate(`/groups/${report.groupId}`)}
                  className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Go to Group & Subscribe
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

