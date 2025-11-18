import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useContract } from '@/hooks/useContract';
import { Subscription } from '@/types';
import { formatDate, getRemainingTime, isSubscriptionExpired } from '@/utils/sui';
import { Link } from 'react-router-dom';
import { Loader, Calendar, ExternalLink } from 'lucide-react';

export function MySubscriptions() {
  const currentAccount = useCurrentAccount();
  const { getUserSubscriptions } = useContract();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentAccount) {
      loadSubscriptions();
    }
  }, [currentAccount]);

  const loadSubscriptions = async () => {
    if (!currentAccount) return;

    try {
      setIsLoading(true);
      const subs = await getUserSubscriptions(currentAccount.address);
      
      const subscriptionsData = subs
        .map((sub: any) => {
          if (sub.data?.content && 'fields' in sub.data.content) {
            const fields = sub.data.content.fields as any;
            return {
              id: sub.data.objectId,
              groupId: fields.group_id,
              subscriber: fields.subscriber,
              telegramId: fields.telegram_id,
              subscribedAt: parseInt(fields.subscribed_at),
              expiresAt: parseInt(fields.expires_at),
            };
          }
          return null;
        })
        .filter((sub): sub is Subscription => sub !== null);

      setSubscriptions(subscriptionsData);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Please connect your wallet first</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter(
    (sub) => !isSubscriptionExpired(sub.expiresAt)
  );
  const expiredSubscriptions = subscriptions.filter(
    (sub) => isSubscriptionExpired(sub.expiresAt)
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Subscriptions</h1>

      {/* Active Subscriptions */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Active Subscriptions ({activeSubscriptions.length})
        </h2>
        
        {activeSubscriptions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">No active subscriptions</p>
            <Link
              to="/groups"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Browse groups and subscribe
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                isActive={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Expired Subscriptions */}
      {expiredSubscriptions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Expired Subscriptions ({expiredSubscriptions.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expiredSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                isActive={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionCard({ subscription, isActive }: {
  subscription: Subscription;
  isActive: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${!isActive && 'opacity-60'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {isActive ? 'Active' : 'Expired'}
        </span>
        <Link
          to={`/groups/${subscription.groupId}`}
          className="text-primary-600 hover:text-primary-700"
        >
          <ExternalLink className="w-5 h-5" />
        </Link>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-500">Telegram ID</p>
          <p className="font-medium">{subscription.telegramId}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Subscribed At</p>
          <p className="text-sm">{formatDate(subscription.subscribedAt)}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Expires At</p>
          <p className="text-sm">{formatDate(subscription.expiresAt)}</p>
        </div>

        {isActive && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center text-sm text-green-600 font-medium">
              <Calendar className="w-4 h-4 mr-2" />
              {getRemainingTime(subscription.expiresAt)}
            </div>
          </div>
        )}
      </div>

      <Link
        to={`/groups/${subscription.groupId}`}
        className="mt-4 block w-full text-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
      >
        View Group
      </Link>
    </div>
  );
}
