import React from 'react';

interface PerfectOwnershipDisplayProps {
  nftOwner: string;
  userAddress?: string;
  isListed?: boolean;
  isAuction?: boolean;
}

const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKET_ADDRESS?.toLowerCase();

export const PerfectOwnershipDisplay: React.FC<PerfectOwnershipDisplayProps> = ({
  nftOwner,
  userAddress,
  isListed,
  isAuction
}) => {
  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  
  const isMarketplace = nftOwner.toLowerCase() === MARKETPLACE_ADDRESS;
  const isUser = userAddress && nftOwner.toLowerCase() === userAddress.toLowerCase();
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Ownership
      </h3>
      
      <div className="space-y-3">
        {/* Owner Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Owned by</span>
          <div className="flex items-center gap-2">
            {isMarketplace ? (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full text-sm font-medium">
                🏪 Marketplace
              </span>
            ) : isUser ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm font-medium">
                ✅ You
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 rounded-full text-sm font-medium">
                👤 Other
              </span>
            )}
          </div>
        </div>
        
        {/* Address */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Address</span>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {shortAddr(nftOwner)}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(nftOwner)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Copy address"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Explanation when marketplace owns it */}
        {isMarketplace && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              <strong>Why marketplace owns it:</strong> {
                isAuction 
                  ? "Currently in auction - held in escrow until auction ends"
                  : isListed 
                  ? "Listed for sale - held in escrow until sold or cancelled"
                  : "Transferred to marketplace for trading"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerfectOwnershipDisplay;
