import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { Header } from '@/components/Header';
import { ConfigDebug } from '@/components/ConfigDebug';
import { Home } from '@/pages/Home';
import { GroupList } from '@/pages/GroupList';
import { GroupDetail } from '@/pages/GroupDetail';
import { CreateGroup } from '@/pages/CreateGroup';
import { PublishReport } from '@/pages/PublishReport';
import { ViewReport } from '@/pages/ViewReport';
import { MySubscriptions } from '@/pages/MySubscriptions';
import { NETWORK } from '@/config/constants';
import '@mysten/dapp-kit/dist/index.css';

const queryClient = new QueryClient();

const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
  devnet: { url: getFullnodeUrl('devnet') },
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork={NETWORK as any}>
        <WalletProvider autoConnect>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/groups" element={<GroupList />} />
                <Route path="/groups/:groupId" element={<GroupDetail />} />
                <Route path="/groups/:groupId/publish" element={<PublishReport />} />
                <Route path="/reports/:reportId" element={<ViewReport />} />
                <Route path="/create-group" element={<CreateGroup />} />
                <Route path="/my-subscriptions" element={<MySubscriptions />} />
              </Routes>
              <ConfigDebug />
            </div>
          </Router>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;

