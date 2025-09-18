/**
 * Enhanced Auction Section Component
 * Uses the new UX analysis for better user experience
 */

import { memo, useState, useEffect } from 'react';
import { type AuctionData } from '@/types/auction';
import { formatBidAmount, type analyzeAuctionForUX } from '@/lib/ui/auction-ux';

interface EnhancedAuctionSectionProps {
    uxAnalysis: ReturnType<typeof analyzeAuctionForUX>;
    auction: AuctionData | null;
    onCreateAuction: () => void;
    onBidAuction: () => void;
    onEndAuction: () => void;
    onCancelAuction: () => void;
    isProcessing: boolean;
    userAddress?: `0x${string}`;
    onRefreshData?: () => Promise<void>;
}

export const EnhancedAuctionSection = memo(({
    uxAnalysis,
    auction,
    onCreateAuction,
    onBidAuction,
    onEndAuction,
    onCancelAuction,
    isProcessing,
    userAddress,
    onRefreshData,
}: EnhancedAuctionSectionProps) => {
    const { status, ownership, timeDisplay, primaryAction, secondaryActions, recommendations } = uxAnalysis;
    const ZERO = '0x0000000000000000000000000000000000000000' as const;

    // ✅ NEW: Real-time auction timer state
    const [liveTimeDisplay, setLiveTimeDisplay] = useState(timeDisplay);

    // ✅ NEW: Update local state when uxAnalysis changes
    useEffect(() => {
        setLiveTimeDisplay(timeDisplay);
    }, [timeDisplay]);

    // ✅ NEW: Real-time timer effect for live auctions
    useEffect(() => {
        // Only run timer for live auctions that haven't ended
        if (!auction || 
            status.message.title !== 'Live Auction' || 
            liveTimeDisplay.urgency === 'critical' ||
            liveTimeDisplay.formatted === 'Ended') {
            return;
        }

        const timer = setInterval(() => {
            setLiveTimeDisplay(prevDisplay => {
                // Parse current time from formatted string (e.g., "5m 30s" or "1h 15m 20s")
                const timeStr = prevDisplay.formatted;
                let totalSeconds = 0;

                // Parse time string to seconds
                if (timeStr.includes('h')) {
                    const parts = timeStr.match(/(\d+)h\s*(\d+)m\s*(\d+)s/);
                    if (parts) {
                        totalSeconds = parseInt(parts[1]) * 3600 + parseInt(parts[2]) * 60 + parseInt(parts[3]);
                    }
                } else if (timeStr.includes('m')) {
                    const parts = timeStr.match(/(\d+)m\s*(\d+)s/);
                    if (parts) {
                        totalSeconds = parseInt(parts[1]) * 60 + parseInt(parts[2]);
                    }
                } else if (timeStr.includes('s')) {
                    const parts = timeStr.match(/(\d+)s/);
                    if (parts) {
                        totalSeconds = parseInt(parts[1]);
                    }
                }

                // Decrease by 1 second
                totalSeconds = Math.max(0, totalSeconds - 1);

                if (totalSeconds <= 0) {
                    // Auction ended, trigger refresh
                    setTimeout(() => onRefreshData?.(), 100);
                    return {
                        ...prevDisplay,
                        formatted: 'Ended',
                        urgency: 'critical' as const,
                        className: 'font-bold text-red-600 dark:text-red-400',
                        icon: '🔴'
                    };
                }

                // Format back to string
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                let newFormatted: string;
                let newUrgency: 'normal' | 'urgent' | 'critical';
                let newClassName: string;

                if (hours > 0) {
                    newFormatted = `${hours}h ${minutes}m ${seconds}s`;
                } else {
                    newFormatted = `${minutes}m ${seconds}s`;
                }

                // Update urgency based on time left
                if (totalSeconds <= 0) {
                    newUrgency = 'critical';
                    newClassName = 'font-bold text-red-600 dark:text-red-400';
                } else if (totalSeconds <= 300) { // 5 minutes
                    newUrgency = 'urgent';
                    newClassName = 'font-bold text-orange-600 dark:text-orange-400 animate-pulse';
                } else {
                    newUrgency = 'normal';
                    newClassName = 'font-bold text-gray-900 dark:text-white';
                }

                return {
                    ...prevDisplay,
                    formatted: newFormatted,
                    urgency: newUrgency,
                    className: newClassName
                };
            });
        }, 1000); // Update every second

        return () => clearInterval(timer);
    }, [auction, status.message.title, liveTimeDisplay.urgency, liveTimeDisplay.formatted, onRefreshData]);

    return (
        <div className="mt-6">
            {/* 🚨 DEBUGGING PANEL - Remove in production */}
            {/*
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <h4 className="text-sm font-bold text-red-800 dark:text-red-200 mb-2">🔍 ENHANCED UX DEBUG</h4>
          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
            <div><strong>Your Address:</strong> {userAddress}</div>
            <div><strong>Status:</strong> {status.message.title}</div>
            <div><strong>Ownership:</strong> {ownership.title}</div>
            <div><strong>Primary Action:</strong> {primaryAction?.type || 'None'}</div>
            <div><strong>Time Display:</strong> {timeDisplay.formatted} ({timeDisplay.urgency})</div>
          </div>
          <button
            onClick={() => onRefreshData?.()}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded"
          >
            Force Refresh Data
          </button>
        </div>
      )}
        */}

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
                {/* ✨ Enhanced Header with better status display */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-xl">🎯</span>
                            Auction Status
                        </h3>
                        <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider border ${status.theme.bgClass}`}>
                            <span className="flex items-center gap-2">
                                {status.theme.icon} {status.message.title}
                            </span>
                        </div>
                    </div>

                    {/* Status description */}
                    <div className="mt-3 text-white/90 text-sm">
                        {status.message.description}
                    </div>
                </div>

                <div className="p-6">
                    {/* ✨ Enhanced ownership information */}
                    <div className={`rounded-xl p-4 mb-6 ${ownership.className}`}>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{ownership.icon}</span>
                            <div>
                                <h5 className="text-sm font-semibold mb-1">
                                    {ownership.title}
                                </h5>
                                <p className="text-xs leading-relaxed">
                                    {ownership.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ✨ Contextual recommendations */}
                    {recommendations.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <span className="text-xl">💡</span>
                                <div>
                                    <h5 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                                        Recommendations
                                    </h5>
                                    <ul className="space-y-1">
                                        {recommendations.map((rec: string, index: number) => (
                                            <li key={index} className="text-xs text-amber-700 dark:text-amber-300">
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {auction ? (
                        <div className="space-y-6">
                            {/* ✨ Enhanced Auction Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Current Bid */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200/60 dark:border-gray-700/60">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">💰</span>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Bid</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className={formatBidAmount(auction.bid).className}>
                                            {formatBidAmount(auction.bid).display}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Bidder: {auction.bidder && auction.bidder !== ZERO
                                                ? `${auction.bidder.slice(0, 6)}...${auction.bidder.slice(-4)}`
                                                : 'None'
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Time Left */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200/60 dark:border-gray-700/60">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">{liveTimeDisplay.icon}</span>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Left</span>
                                    </div>
                                    <p className={`text-xl ${liveTimeDisplay.className}`}>
                                        {liveTimeDisplay.formatted}
                                    </p>
                                    {liveTimeDisplay.urgency !== 'normal' && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {liveTimeDisplay.urgency === 'critical' ? 'Auction ended!' : 'Ending soon!'}
                                        </p>
                                    )}
                                </div>

                                {/* Seller Info */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200/60 dark:border-gray-700/60">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">👤</span>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Seller</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {auction.seller.slice(0, 6)}...{auction.seller.slice(-4)}
                                    </p>
                                    {ownership.title === 'Your NFT is in Auction Escrow' && (
                                        <div className="mt-2">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                You (Seller)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ✨ SMART ACTION BUTTONS - Better UX for expired auctions */}
                            <div className="flex flex-wrap gap-3">
                                {(() => {
                                    // 🔥 FIXED: Use the actual status from UX analysis, not urgency
                                    const isAuctionEnded = status.message.title === 'Auction Ended';
                                    const isAuctionLive = status.message.title === 'Live Auction';
                                    const hasBids = auction && auction.bid > BigInt(0);
                                    const isSellerViewing = ownership.title === 'Your NFT is in Auction Escrow';

                                    if (isAuctionEnded) {
                                        // 🔥 AUCTION ENDED - Show only relevant action
                                        if (hasBids) {
                                            // Has winner - Anyone can finalize
                                            return (
                                                <div className="w-full">
                                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-2xl">🏆</span>
                                                            <div>
                                                                <h5 className="text-sm font-semibold text-green-800 dark:text-green-200">
                                                                    Auction Won!
                                                                </h5>
                                                                <p className="text-xs text-green-700 dark:text-green-300">
                                                                    Click &ldquo;Finalize Sale&rdquo; to complete the transaction and transfer the NFT to the winner.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={onEndAuction}
                                                        disabled={isProcessing}
                                                        className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                                                    >
                                                        {isProcessing ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                Finalizing Sale...
                                                            </div>
                                                        ) : (
                                                            <span className="flex items-center justify-center gap-2">
                                                                🏆 Finalize Sale
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        } else {
                                            // No bids - Only seller can reclaim
                                            return (
                                                <div className="w-full">
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-2xl">📦</span>
                                                            <div>
                                                                <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                                                    No Bids Received
                                                                </h5>
                                                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                                                    {isSellerViewing
                                                                        ? "Click 'Reclaim NFT' to get your NFT back to your wallet."
                                                                        : "The seller needs to reclaim their NFT since no bids were placed."
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSellerViewing && (
                                                        <button
                                                            onClick={onEndAuction}
                                                            disabled={isProcessing}
                                                            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100"
                                                        >
                                                            {isProcessing ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                    Reclaiming NFT...
                                                                </div>
                                                            ) : (
                                                                <span className="flex items-center justify-center gap-2">
                                                                    📦 Reclaim My NFT
                                                                </span>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }
                                    } else if (isAuctionLive) {
                                        // 🔄 AUCTION STILL ACTIVE - Show normal actions
                                        return (
                                            <>
                                                {primaryAction && (
                                                    <button
                                                        onClick={() => {
                                                            if (primaryAction.type === 'create') onCreateAuction();
                                                            else if (primaryAction.type === 'bid') onBidAuction();
                                                            else if (primaryAction.type === 'end') onEndAuction();
                                                            else if (primaryAction.type === 'cancel') onCancelAuction();
                                                        }}
                                                        disabled={isProcessing}
                                                        className={`flex-1 min-w-[120px] px-6 py-3 ${primaryAction.config.className} rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                                                        title={primaryAction.config.tooltip}
                                                    >
                                                        {isProcessing ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                Processing...
                                                            </div>
                                                        ) : (
                                                            <span className="flex items-center justify-center gap-2">
                                                                {primaryAction.config.icon} {primaryAction.config.label}
                                                            </span>
                                                        )}
                                                    </button>
                                                )}

                                                {/* Only show cancel for active auctions without bids */}
                                                {secondaryActions.filter(action => {
                                                    if (action?.type === 'cancel') {
                                                        return !hasBids; // Only show cancel if no bids
                                                    }
                                                    return action?.type !== 'end'; // Hide end button for active auctions
                                                }).map((action, index: number) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            if (action?.type === 'create') onCreateAuction();
                                                            else if (action?.type === 'bid') onBidAuction();
                                                            else if (action?.type === 'cancel') onCancelAuction();
                                                        }}
                                                        disabled={isProcessing || action?.config.className.includes('cursor-not-allowed')}
                                                        className={`px-6 py-3 ${action?.config.className} rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                                                        title={action?.config.tooltip}
                                                    >
                                                        {action?.config.icon} {action?.config.label}
                                                    </button>
                                                ))}
                                            </>
                                        );
                                    } else {
                                        // 📂 NO AUCTION or other states - Show normal actions from UX analysis
                                        return (
                                            <>
                                                {primaryAction && (
                                                    <button
                                                        onClick={() => {
                                                            if (primaryAction.type === 'create') onCreateAuction();
                                                            else if (primaryAction.type === 'bid') onBidAuction();
                                                            else if (primaryAction.type === 'end') onEndAuction();
                                                            else if (primaryAction.type === 'cancel') onCancelAuction();
                                                        }}
                                                        disabled={isProcessing}
                                                        className={`flex-1 min-w-[120px] px-6 py-3 ${primaryAction.config.className} rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                                                        title={primaryAction.config.tooltip}
                                                    >
                                                        {isProcessing ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                Processing...
                                                            </div>
                                                        ) : (
                                                            <span className="flex items-center justify-center gap-2">
                                                                {primaryAction.config.icon} {primaryAction.config.label}
                                                            </span>
                                                        )}
                                                    </button>
                                                )}
                                                {secondaryActions.map((action, index: number) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            if (action?.type === 'create') onCreateAuction();
                                                            else if (action?.type === 'bid') onBidAuction();
                                                            else if (action?.type === 'cancel') onCancelAuction();
                                                        }}
                                                        disabled={isProcessing || action?.config.className.includes('cursor-not-allowed')}
                                                        className={`px-6 py-3 ${action?.config.className} rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                                                        title={action?.config.tooltip}
                                                    >
                                                        {action?.config.icon} {action?.config.label}
                                                    </button>
                                                ))}
                                            </>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    ) : (
                        // ✨ Enhanced No Auction State
                        <div className="text-center py-8">
                            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                <span className="text-3xl">📦</span>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {status.message.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                                {status.message.description}
                            </p>

                            {primaryAction && (
                                <button
                                    onClick={() => {
                                        if (primaryAction.type === 'create') onCreateAuction();
                                    }}
                                    disabled={isProcessing}
                                    className={`px-8 py-3 ${primaryAction.config.className} rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        {primaryAction.config.icon} {primaryAction.config.label}
                                    </span>
                                </button>
                            )}

                            {!primaryAction && secondaryActions.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 max-w-md mx-auto">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">⚠️</span>
                                        <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                            {secondaryActions[0]?.config.description || 'Action not available'}
                                        </span>
                                    </div>
                                    {secondaryActions[0]?.config.tooltip && (
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            {secondaryActions[0].config.tooltip}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

EnhancedAuctionSection.displayName = 'EnhancedAuctionSection';
