import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useContract } from '@/hooks/useContract';
import { useTelegram } from '@/hooks/useTelegram';
import { Group, Subscription } from '@/types';
import { formatSui, formatDate, getRemainingTime, mistToSui } from '@/utils/sui';
import { ReportList } from '@/components/ReportList';
import { message, Modal, Input } from 'antd';
import { Users, Calendar, DollarSign, FileText, Send, Plus } from 'lucide-react';

export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const { getGroup, subscribe, getUserSubscriptions, isLoading } = useContract();
  const { sendTelegramNotification } = useTelegram();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [userSubscription, setUserSubscription] = useState<Subscription | null>(null);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [telegramId, setTelegramId] = useState('');

  useEffect(() => {
    if (groupId) {
      loadGroup();
      if (currentAccount) {
        loadUserSubscription();
      }
    }
  }, [groupId, currentAccount]);

  const loadGroup = async () => {
    if (!groupId) return;
    
    try {
      const result = await getGroup(groupId);
      
      if (result.data?.content && 'fields' in result.data.content) {
        const fields = result.data.content.fields as any;
        setGroup({
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
        });
      }
    } catch (error) {
      console.error('Failed to load group:', error);
      message.error('Failed to load group information');
    }
  };

  const loadUserSubscription = async () => {
    if (!currentAccount || !groupId) return;
    
    try {
      const subscriptions = await getUserSubscriptions(currentAccount.address);
      
      // Find active subscription for this group
      const activeSubscription = subscriptions.find((sub: any) => {
        const fields = sub.data?.content?.fields;
        return fields?.group_id === groupId && 
               parseInt(fields?.expires_at) > Date.now();
      });
      
      if (activeSubscription?.data?.content && 'fields' in activeSubscription.data.content) {
        const fields = activeSubscription.data.content.fields as any;
        setUserSubscription({
          id: activeSubscription.data.objectId,
          groupId: fields.group_id,
          subscriber: fields.subscriber,
          telegramId: fields.telegram_id,
          subscribedAt: parseInt(fields.subscribed_at),
          expiresAt: parseInt(fields.expires_at),
        });
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!currentAccount || !group || !telegramId) {
      message.error('Please enter your Telegram ID');
      return;
    }

    try {
      message.loading({ content: 'Subscribing...', key: 'subscribe' });
      
      await subscribe(
        group.id,
        mistToSui(group.subscriptionFee),
        telegramId
      );

      message.success({ content: 'Subscription successful!', key: 'subscribe' });
      
      // Send notification
      await sendTelegramNotification(
        group.telegramGroupId,
        `🎉 New member joined!\n\nTelegram ID: ${telegramId}`
      );

      setIsSubscribeModalOpen(false);
      loadUserSubscription();
    } catch (error) {
      console.error('Failed to subscribe:', error);
      message.error({ content: 'Subscription failed, please try again', key: 'subscribe' });
    }
  };

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-8 py-12">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-4">{group.name}</h1>
              <p className="text-primary-100">{group.description}</p>
            </div>
            {/* Publish Report Button (Owner Only) */}
            {currentAccount && currentAccount.address === group.owner && (
              <button
                onClick={() => navigate(`/groups/${groupId}/publish`)}
                className="flex items-center px-4 py-2 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors ml-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Publish Report
              </button>
            )}
          </div>
        </div>

        {/* Group Info */}
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start">
              <DollarSign className="w-5 h-5 text-primary-600 mr-2 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Subscription Fee</p>
                <p className="text-lg font-semibold">{formatSui(group.subscriptionFee)}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-primary-600 mr-2 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Subscription Period</p>
                <p className="text-lg font-semibold">
                  {Math.floor(group.subscriptionPeriod / 86400000)} days
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Users className="w-5 h-5 text-primary-600 mr-2 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Members</p>
                <p className="text-lg font-semibold">
                  {group.currentMembers}
                  {group.maxMembers > 0 ? ` / ${group.maxMembers}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <FileText className="w-5 h-5 text-primary-600 mr-2 mt-1" />
              <div>
                <p className="text-sm text-gray-500">Reports</p>
                <p className="text-lg font-semibold">{group.reportCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="px-8 py-6">
          {userSubscription ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                ✓ Subscribed
              </h3>
              <div className="space-y-2 text-sm text-green-700">
                <p>Subscribed At: {formatDate(userSubscription.subscribedAt)}</p>
                <p>Expires At: {formatDate(userSubscription.expiresAt)}</p>
                <p className="font-medium">
                  {getRemainingTime(userSubscription.expiresAt)}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Subscribe to view detailed research reports</p>
              <button
                onClick={() => setIsSubscribeModalOpen(true)}
                disabled={isLoading || !currentAccount}
                className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {currentAccount ? 'Subscribe Now' : 'Please connect wallet first'}
              </button>
            </div>
          )}
        </div>

        {/* Telegram Group */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Telegram Group</p>
              <p className="text-lg font-medium">{group.telegramGroupId}</p>
            </div>
            <a
              href={group.telegramInviteLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Send className="w-4 h-4 mr-2" />
              Join Group
            </a>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-lg p-8 mt-6">
        <ReportList 
          groupId={groupId!} 
          isSubscribed={!!userSubscription && userSubscription.expiresAt > Date.now()}
        />
      </div>

      {/* Subscribe Modal */}
      <Modal
        title="Subscribe to Group"
        open={isSubscribeModalOpen}
        onOk={handleSubscribe}
        onCancel={() => setIsSubscribeModalOpen(false)}
        okText="Confirm Subscription"
        cancelText="Cancel"
        confirmLoading={isLoading}
      >
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Subscription Fee</p>
            <p className="text-2xl font-bold text-primary-600">
              {formatSui(group.subscriptionFee)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telegram ID *
            </label>
            <Input
              placeholder="Enter your Telegram username or ID"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              prefix="@"
            />
            <p className="mt-2 text-xs text-gray-500">
              Used to link your Sui address with Telegram account
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
