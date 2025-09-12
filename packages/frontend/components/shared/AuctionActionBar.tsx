'use client';

import { memo, useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useCreateAuction } from '@/hooks/useCreateAuction';
import { useBidAuction } from '@/hooks/useBidValue';
import { useEndAuction } from '@/hooks/useEndAuction';
import { useCancelAuction } from '@/hooks/useCancelAuction';

// Enhanced types
type AuctionStatus = 'not_started' | 'live' | 'ended' | 'cancelled';

type AuctionActionBarProps = {
  // NFT Information
  nft: `0x${string}`;
  tokenId: string | number | bigint;
  
  // Auction State
  currentBidWei?: bigint;
  auctionEndTime?: number; // timestamp in seconds
  status: AuctionStatus;
  isOwner?: boolean;
  hasBids?: boolean;
  
  // Callbacks
  onAuctionCreated?: (txHash: `0x${string}`) => void;
  onBidPlaced?: (txHash: `0x${string}`, bidAmount: bigint) => void;
  onAuctionEnded?: (txHash: `0x${string}`, success: boolean) => void;
  onAuctionCancelled?: (txHash: `0x${string}`, success: boolean) => void;
  onStatus?: (status: string, type?: 'info' | 'success' | 'error') => void;
  
  // UI State
  className?: string;
  showAdvancedInfo?: boolean;
  enableNotifications?: boolean;
};

// Time formatting utilities
function formatCountdown(seconds: number): { display: string; isUrgent: boolean; parts: { hours: number; minutes: number; seconds: number } } {
  const total = Math.max(0, seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const display = hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
  const isUrgent = total < 300; // Less than 5 minutes
  
  return {
    display,
    isUrgent,
    parts: { hours, minutes, seconds: secs }
  };
}

const AuctionActionBar = memo(function AuctionActionBar({
  nft,
  tokenId,
  currentBidWei = BigInt(0),
  auctionEndTime,
  status,
  isOwner = false,
  hasBids = false,
  onAuctionCreated,
  onBidPlaced,
  onAuctionEnded,
  onAuctionCancelled,
  onStatus,
  className = '',
  showAdvancedInfo = true,
  enableNotifications = true,
}: AuctionActionBarProps) {
  // User account info
  const { isConnected } = useAccount();
  
  // Hooks integration
  const createAuction = useCreateAuction({
    nft,
    tokenId,
    isOwner,
    onCreated: onAuctionCreated,
    onStatus,
  });

  const bidAuction = useBidAuction({
    nft,
    tokenId,
    currentBidWei,
    auctionEndTime,
    onBidded: onBidPlaced,
    onStatus,
  });

  const endAuction = useEndAuction({
    nft,
    tokenId,
    auctionEndTime: auctionEndTime ? auctionEndTime * 1000 : undefined, // Convert to ms
    isOwner,
    onEnded: onAuctionEnded,
    onStatus,
  });

  const cancelAuction = useCancelAuction({
    nft,
    tokenId,
    isOwner,
    hasBids,
    isLive: status === 'live',
    onCanceled: onAuctionCancelled,
    onStatus,
  });

  // Time tracking
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000));
  const timeRemaining = auctionEndTime ? Math.max(0, auctionEndTime - currentTime) : 0;
  const countdown = formatCountdown(timeRemaining);

  useEffect(() => {
    if (status !== 'live') return;
    
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status]);

  // Notifications
  useEffect(() => {
    if (!enableNotifications || status !== 'live') return;
    
    // Urgent notification when less than 5 minutes
    if (timeRemaining > 0 && timeRemaining < 300 && timeRemaining % 60 === 0) {
      onStatus?.(`Auction ending in ${Math.ceil(timeRemaining / 60)} minutes!`, 'info');
    }
    
    // Final countdown
    if (timeRemaining === 30) {
      onStatus?.('30 seconds left!', 'info');
    }
  }, [timeRemaining, enableNotifications, status, onStatus]);

  // Computed properties
  const priceDisplay = currentBidWei > BigInt(0) ? formatEther(currentBidWei) : '0';
  const canBid = status === 'live' && !isOwner && isConnected;
  const canEnd = status === 'live' && timeRemaining === 0;
  const canCancel = status === 'live' && isOwner && !hasBids;
  const canCreate = status === 'not_started' && isOwner;

  // Action handlers
  const handleCreateAuction = () => {
    createAuction.openModal();
  };

  const handlePlaceBid = () => {
    bidAuction.openModal();
  };

  const handleEndAuction = () => {
    endAuction.endAuction();
  };

  const handleCancelAuction = () => {
    cancelAuction.cancelAuction();
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200/60 dark:border-gray-700/60 ${className}`}>
      
      {/* Main Info Section */}
      <div className="flex items-center justify-between flex-wrap gap-6 mb-6">
        
        {/* Price & Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Bid</p>
            {showAdvancedInfo && currentBidWei > BigInt(0) && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                {hasBids ? 'Active' : 'Reserve'}
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-4 flex-wrap">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {priceDisplay} ETH
            </span>
            
            {showAdvancedInfo && currentBidWei > BigInt(0) && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ≈ ${(parseFloat(priceDisplay) * 2500).toLocaleString()} USD
              </span>
            )}
          </div>
        </div>

        {/* Time Status */}
        <div className="text-right">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {status === 'live' ? 'Time Left' : 'Status'}
          </p>
          
          {status === 'live' && timeRemaining > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold ${
              countdown.isUrgent 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            }`}>
              <span>{countdown.isUrgent ? '🔥' : '⏰'}</span>
              <span className="font-mono text-lg">{countdown.display}</span>
            </div>
          )}
          
          {status === 'ended' && (
            <span className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-sm font-medium">
              <span>✅</span>
              Auction Ended
            </span>
          )}
          
          {status === 'cancelled' && (
            <span className="inline-flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium">
              <span>❌</span>
              Cancelled
            </span>
          )}
          
          {status === 'not_started' && (
            <span className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              <span>💤</span>
              Not Started
            </span>
          )}
        </div>
      </div>

      {/* Advanced Info */}
      {showAdvancedInfo && status === 'live' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Bids</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {hasBids ? '1+' : '0'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bid Increment</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              0.001 ETH
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Network</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              Sepolia
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gas Fee</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ~$2-5
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        
        {/* Create Auction */}
        {canCreate && (
          <button
            onClick={handleCreateAuction}
            disabled={createAuction.isProcessing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            {createAuction.isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>🚀</span>
                Create Auction
              </span>
            )}
          </button>
        )}

        {/* Place Bid */}
        {canBid && (
          <button
            onClick={handlePlaceBid}
            disabled={bidAuction.currentStep === 'bidding'}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            {bidAuction.currentStep === 'bidding' ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Bidding...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>🎯</span>
                Place Bid
              </span>
            )}
          </button>
        )}

        {/* End Auction */}
        {canEnd && (
          <button
            onClick={handleEndAuction}
            disabled={endAuction.isBusy}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            {endAuction.isBusy ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Ending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>🏁</span>
                End Auction e
              </span>
            )}
          </button>
        )}

        {/* Cancel Auction */}
        {canCancel && (
          <button
            onClick={handleCancelAuction}
            disabled={cancelAuction.isBusy}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            {cancelAuction.isBusy ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Cancelling...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>❌</span>
                Cancel Auction
              </span>
            )}
          </button>
        )}

        {/* Connection Required */}
        {!isConnected && (canBid || canCreate) && (
          <button
            onClick={() => onStatus?.('Please connect your wallet to continue', 'info')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold transition-all"
          >
            <span className="flex items-center gap-2">
              <span>🔗</span>
              Connect Wallet
            </span>
          </button>
        )}
      </div>

      {/* Status Messages */}
      {showAdvancedInfo && (
        <div className="mt-4 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
          💡 {status === 'live' 
            ? 'Bid amounts are locked until auction ends' 
            : status === 'ended'
              ? 'Winner can claim NFT, seller can withdraw proceeds'
              : 'Auction not yet started'
          }
        </div>
      )}
    </div>
  );
});

export default AuctionActionBar;
