import { useState, useEffect } from 'react';
import { useContract } from '@/hooks/useContract';
import { GroupCard } from '@/components/GroupCard';
import { Group } from '@/types';
import { Loader } from 'lucide-react';

export function GroupList() {
  const { getAllGroups } = useContract();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const events = await getAllGroups();
      
      // Parse events and extract group data
      const groupsData = events.map((event: any) => {
        const parsedJson = event.parsedJson;
        return {
          id: parsedJson.group_id,
          name: parsedJson.name,
          description: '',
          owner: parsedJson.owner,
          subscriptionFee: parsedJson.subscription_fee,
          subscriptionPeriod: parsedJson.subscription_period,
          maxMembers: 0,
          currentMembers: 0,
          telegramGroupId: parsedJson.telegram_group_id,
          reportCount: 0,
          createdAt: event.timestampMs ? parseInt(event.timestampMs) : Date.now(),
        };
      });
      
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Research Groups</h1>
        <button
          onClick={loadGroups}
          className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No groups yet</p>
          <p className="text-gray-400 mt-2">Be the first to create a group!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
