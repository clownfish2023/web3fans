import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContract } from '@/hooks/useContract';
import { useTelegram } from '@/hooks/useTelegram';
import { SUBSCRIPTION_PERIODS } from '@/config/constants';
import { message } from 'antd';

export function CreateGroup() {
  const navigate = useNavigate();
  const { createGroup, isLoading } = useContract();
  const { sendTelegramNotification } = useTelegram();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subscriptionFee: 0.1,
    subscriptionPeriod: SUBSCRIPTION_PERIODS[2].value, // 30 days
    maxMembers: 0,
    telegramGroupId: '',
    telegramInviteLink: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.telegramGroupId || !formData.telegramInviteLink) {
      message.error('Please fill in all required fields');
      return;
    }

    // Validate subscription fee
    if (formData.subscriptionFee < 0.001) {
      message.error('Subscription fee must be at least 0.001 SUI');
      return;
    }

    // Validate Telegram invite link format
    if (!formData.telegramInviteLink.startsWith('https://t.me/')) {
      message.error('Telegram invite link must start with https://t.me/');
      return;
    }

    try {
      message.loading({ content: 'Creating group...', key: 'create' });
      
      await createGroup(
        formData.name,
        formData.description,
        formData.subscriptionFee,
        formData.subscriptionPeriod,
        formData.maxMembers,
        formData.telegramGroupId,
        formData.telegramInviteLink
      );

      message.success({ content: 'Group created successfully!', key: 'create' });
      
      // Send notification to Telegram
      await sendTelegramNotification(
        formData.telegramGroupId,
        `🎉 New group created!\n\nGroup Name: ${formData.name}\n${formData.description}`
      );

      navigate('/groups');
    } catch (error) {
      console.error('Failed to create group:', error);
      message.error({ 
        content: 'Failed to create group, please try again', 
        key: 'create' 
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Research Group</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Group Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter group name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Group Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Describe your research group..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Fee (SUI) *
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={formData.subscriptionFee}
              onChange={(e) => setFormData({ ...formData, subscriptionFee: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., 0.001, 0.1, 1.0"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Minimum: 0.001 SUI (1,000,000 MIST)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Period *
            </label>
            <select
              value={formData.subscriptionPeriod}
              onChange={(e) => setFormData({ ...formData, subscriptionPeriod: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              {SUBSCRIPTION_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Member Limit (0 = unlimited)
          </label>
          <input
            type="number"
            min="0"
            value={formData.maxMembers}
            onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telegram Group ID *
            </label>
            <input
              type="text"
              value={formData.telegramGroupId}
              onChange={(e) => setFormData({ ...formData, telegramGroupId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="@your_telegram_group"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter your Telegram group username or ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telegram Invite Link *
            </label>
            <input
              type="url"
              value={formData.telegramInviteLink}
              onChange={(e) => setFormData({ ...formData, telegramInviteLink: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="https://t.me/+XxXxXxX"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              <a href="#" className="text-primary-600 hover:text-primary-700" onClick={(e) => {
                e.preventDefault();
                window.open('https://telegram.org/blog/invite-links', '_blank');
              }}>
                How to get invite link?
              </a>
            </p>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
