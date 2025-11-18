import { Link } from 'react-router-dom';
import { Shield, Database, MessageCircle, TrendingUp } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Web3 Research Subscription Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Decentralized investment research content subscription platform
            <br />
            Based on Sui Seal + Walrus
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/groups"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Browse Groups
            </Link>
            <Link
              to="/create-group"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-medium border-2 border-primary-600 hover:bg-primary-50 transition-colors"
            >
              Create Group
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Core Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Shield className="w-12 h-12 text-primary-600" />}
            title="Secure Access Control"
            description="Subscription-based access control using Sui Seal, only paid subscribers can view report details"
          />
          <FeatureCard
            icon={<Database className="w-12 h-12 text-primary-600" />}
            title="Decentralized Storage"
            description="Reports are encrypted and stored on Walrus, ensuring data security and decentralization"
          />
          <FeatureCard
            icon={<MessageCircle className="w-12 h-12 text-primary-600" />}
            title="Telegram Integration"
            description="Seamless integration with Telegram groups for real-time research report updates"
          />
          <FeatureCard
            icon={<TrendingUp className="w-12 h-12 text-primary-600" />}
            title="Flexible Subscriptions"
            description="Support multiple subscription periods and prices to meet different user needs"
          />
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              title="Create or Browse Groups"
              description="Research experts can create their own research groups and set subscription prices and periods. Users can browse all groups and choose content of interest."
            />
            <StepCard
              step={2}
              title="Subscribe to Groups"
              description="Connect wallet, pay subscription fee, link Telegram ID, and become a group member."
            />
            <StepCard
              step={3}
              title="View Reports"
              description="View report summaries in Telegram groups. Subscribed users can access full reports through access control."
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="bg-primary-600 rounded-2xl px-8 py-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-primary-100 mb-8 text-lg">
            Create your research group or subscribe to interesting content now
          </p>
          <Link
            to="/create-group"
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({ step, title, description }: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold mb-4">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
