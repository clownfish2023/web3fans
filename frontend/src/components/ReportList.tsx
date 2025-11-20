import { useState, useEffect } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { PACKAGE_ID, MODULE_NAME } from '@/config/constants';
import { Report } from '@/types';
import { formatDate } from '@/utils/sui';
import { FileText, Lock, Eye } from 'lucide-react';

interface ReportListProps {
  groupId: string;
  isSubscribed: boolean;
}

export function ReportList({ groupId, isSubscribed }: ReportListProps) {
  const client = useSuiClient();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [groupId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Query ReportPublished events for this group
      const result = await client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::ReportPublished`,
        },
      });
      
      // Filter events for this group
      const groupReportEvents = result.data
        .filter((event: any) => event.parsedJson?.group_id === groupId)
        .reverse(); // Latest first
      
      // Fetch full report objects to get summary
      const groupReports = await Promise.all(
        groupReportEvents.map(async (event: any) => {
          const data = event.parsedJson;
          
          try {
            // Fetch full report object
            const reportObj = await client.getObject({
              id: data.report_id,
              options: {
                showContent: true,
              },
            });
            
            const fields = (reportObj.data?.content as any)?.fields;
            
            return {
              id: data.report_id,
              groupId: data.group_id,
              title: fields?.title || data.title,
              summary: fields?.summary || '',
              walrusBlobId: fields?.walrus_blob_id || data.walrus_blob_id,
              sealKeyId: fields?.seal_key_id || [],
              publisher: data.publisher,
              publishedAt: parseInt(event.timestampMs || '0'),
            };
          } catch (error) {
            console.error('Failed to fetch report details:', error);
            // Fallback to event data
            return {
              id: data.report_id,
              groupId: data.group_id,
              title: data.title,
              summary: '',
              walrusBlobId: data.walrus_blob_id,
              sealKeyId: [],
              publisher: data.publisher,
              publishedAt: parseInt(event.timestampMs || '0'),
            };
          }
        })
      );
      
      setReports(groupReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (report: Report) => {
    if (!isSubscribed) {
      // Show summary alert
      alert(`This report is encrypted. Subscribe to this group to view the full content.\n\nSummary:\n${report.summary || 'No summary available'}`);
      return;
    }
    
    // Navigate to view report page
    window.location.href = `/reports/${report.id}`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Yet</h3>
        <p className="text-gray-500">
          Reports published by the group owner will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Research Reports ({reports.length})
      </h2>
      
      <div className="grid gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-primary-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start">
                  <FileText className="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      Published {formatDate(report.publishedAt)}
                    </p>
                    {report.summary && (
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {report.summary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleViewReport(report)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ml-4 ${
                  isSubscribed
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isSubscribed ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Report
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Subscribe to View
                  </>
                )}
              </button>
            </div>
            
            {!isSubscribed && (
              <div className="mt-4 flex items-start bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <Lock className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  This report is encrypted. Subscribe to this group to access the full content.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

