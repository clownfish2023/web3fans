import { Group } from '@/types';
import { formatSui, formatDate } from '@/utils/sui';
import { Link } from 'react-router-dom';
import { Users, Calendar, DollarSign } from 'lucide-react';

interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
  const memberPercentage = group.maxMembers > 0
    ? (group.currentMembers / group.maxMembers) * 100
    : 0;

  return (
    <Link
      to={`/groups/${group.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
    >
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{group.name}</h3>
      <p className="text-gray-600 mb-4 line-clamp-2">{group.description}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <DollarSign className="w-4 h-4 mr-2" />
          <span>Subscription: {formatSui(group.subscriptionFee)}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Period: {Math.floor(group.subscriptionPeriod / 86400000)} days</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2" />
          <span>
            Members: {group.currentMembers}
            {group.maxMembers > 0 ? ` / ${group.maxMembers}` : ''}
          </span>
        </div>
      </div>

      {group.maxMembers > 0 && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${memberPercentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {group.reportCount} reports
        </span>
        <span className="text-gray-500">
          Created {formatDate(group.createdAt)}
        </span>
      </div>
    </Link>
  );
}
