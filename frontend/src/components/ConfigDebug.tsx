import { PACKAGE_ID, NETWORK } from '@/config/constants';

export function ConfigDebug() {
  // Only show in development
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-sm">
      <div className="font-bold mb-2">🔧 Debug Info</div>
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Network:</span> {NETWORK}
        </div>
        <div>
          <span className="text-gray-400">Package ID:</span>
          <div className="break-all text-[10px] mt-1">
            {PACKAGE_ID === '0x0' ? (
              <span className="text-red-400">⚠️ Not configured!</span>
            ) : (
              <span className="text-green-400">{PACKAGE_ID}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

