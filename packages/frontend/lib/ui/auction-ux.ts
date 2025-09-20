import { type AuctionData, type OwnershipState, type AuctionActionValidity, AuctionUtils } from '@/types/auction';

export const AUCTION_THEMES = {
  live: {
    color: 'green',
    icon: '🔴',
    bgClass: 'bg-green-500/20 text-green-100 border-green-400/30',
    accentClass: 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
    pulseClass: 'animate-pulse',
  },
  ended: {
    color: 'orange',
    icon: '⏰',
    bgClass: 'bg-orange-500/20 text-orange-100 border-orange-400/30',
    accentClass: 'from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700',
    pulseClass: '',
  },
  completed: {
    color: 'green',
    icon: '✅',
    bgClass: 'bg-green-500/20 text-green-100 border-green-400/30',
    accentClass: 'from-green-500 to-emerald-600',
    pulseClass: '',
  },
  none: {
    color: 'gray',
    icon: '⚫',
    bgClass: 'bg-gray-500/20 text-gray-100 border-gray-400/30',
    accentClass: 'from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
    pulseClass: '',
  },
} as const;

export const AUCTION_STATUS_MESSAGES = {
  live: {
    title: 'Live Auction',
    subtitle: 'Bidding is active',
    description: 'This auction is currently accepting bids. Place your bid before time runs out!',
  },
  ended: {
    title: 'Auction Ended',
    subtitle: 'Awaiting finalization',
    description: 'The auction time has expired. The seller needs to finalize the auction to complete the sale or reclaim the NFT.',
  },
  completed: {
    title: 'Auction Completed',
    subtitle: 'Successfully finished',
    description: 'This auction has ended and the NFT has been transferred to the winner.',
  },
  none: {
    title: 'No Active Auction',
    subtitle: 'Available for auction',
    description: 'This NFT is not currently being auctioned. The owner can create an auction to sell it.',
  },
} as const;

export function formatTimeWithUrgency(timeLeftMs: number): {
  formatted: string;
  urgency: 'critical' | 'urgent' | 'normal';
  className: string;
  icon: string;
} {
  const seconds = Math.floor(timeLeftMs / 1000);
  
  if (seconds <= 0) {
    return {
      formatted: 'Ended',
      urgency: 'critical',
      className: 'text-red-600 dark:text-red-400 font-bold',
      icon: '🔴',
    };
  }
  
  if (seconds < 60) { 
    return {
      formatted: `${seconds}s`,
      urgency: 'critical',
      className: 'text-red-600 dark:text-red-400 animate-pulse font-bold',
      icon: '🚨',
    };
  }
  
  if (seconds < 300) { 
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return {
      formatted: `${mins}m ${secs}s`,
      urgency: 'urgent',
      className: 'text-orange-600 dark:text-orange-400 animate-pulse font-semibold',
      icon: '⚠️',
    };
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSecs = seconds % 60;
  
  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${remainingSecs}s`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${remainingSecs}s`;
  } else {
    formatted = `${remainingSecs}s`;
  }
  
  return {
    formatted,
    urgency: 'normal',
    className: 'text-gray-900 dark:text-white font-medium',
    icon: '⏰',
  };
}

export function getOwnershipMessage(ownershipState: OwnershipState): {
  title: string;
  description: string;
  icon: string;
  type: 'info' | 'warning' | 'success';
  className: string;
} {
  if (ownershipState.isDirectOwner && !ownershipState.isInMarketplaceEscrow) {
    return {
      title: 'You Own This NFT',
      description: 'This NFT is directly in your wallet. You have full control over it.',
      icon: '👑',
      type: 'success',
      className: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    };
  }
  
  if (ownershipState.isAuctionSeller && ownershipState.isInMarketplaceEscrow) {
    return {
      title: 'Your NFT is in Auction Escrow',
      description: 'Your NFT is safely held by the marketplace smart contract during the auction. You\'ll regain ownership if there are no bids, or receive payment if someone wins.',
      icon: '🔒',
      type: 'info',
      className: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    };
  }
  
  if (ownershipState.isWinningBidder) {
    return {
      title: 'You Have the Winning Bid',
      description: 'You currently have the highest bid on this auction. You\'ll receive the NFT when the auction ends.',
      icon: '🏆',
      type: 'success',
      className: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    };
  }
  
  return {
    title: 'You Don\'t Own This NFT',
    description: 'This NFT belongs to another user. You can place bids if there\'s an active auction.',
    icon: '👀',
    type: 'info',
    className: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200',
  };
}

// Action button configurations with improved UX
export function getActionButtonConfig(
  action: 'create' | 'bid' | 'end' | 'cancel',
  canPerform: boolean,
  reason?: string
): {
  label: string;
  icon: string;
  className: string;
  description: string;
  tooltip?: string;
} {
  const configs = {
    create: {
      label: 'Create Auction',
      icon: '🚀',
      className: canPerform 
        ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold'
        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
      description: canPerform 
        ? 'Start an auction to let others bid on your NFT'
        : reason || 'Cannot create auction at this time',
      tooltip: canPerform ? undefined : reason,
    },
    bid: {
      label: 'Place Bid',
      icon: '🎯',
      className: canPerform
        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold'
        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
      description: canPerform
        ? 'Place your bid to win this NFT'
        : reason || 'Cannot place bid at this time',
      tooltip: canPerform ? undefined : reason,
    },
    end: {
      label: 'End Auction',
      icon: '🏁',
      className: canPerform
        ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold'
        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
      description: canPerform
        ? 'Finalize the auction and transfer the NFT'
        : reason || 'Cannot end auction at this time',
      tooltip: canPerform ? undefined : reason,
    },
    cancel: {
      label: 'Cancel Auction',
      icon: '❌',
      className: canPerform
        ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-medium'
        : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed',
      description: canPerform
        ? 'Cancel the auction and return your NFT'
        : reason || 'Cannot cancel auction at this time',
      tooltip: canPerform ? undefined : reason,
    },
  };
  
  return configs[action];
}

// Bid amount formatting with better UX
export function formatBidAmount(bidWei: bigint): {
  eth: string;
  usd?: string;
  display: string;
  className: string;
} {
  const ethValue = Number(bidWei) / 1e18;
  
  if (ethValue === 0) {
    return {
      eth: '0',
      display: 'No bids yet',
      className: 'text-gray-500 dark:text-gray-400 italic',
    };
  }
  
  if (ethValue < 0.001) {
    return {
      eth: ethValue.toFixed(6),
      display: `${ethValue.toFixed(6)} ETH`,
      className: 'text-gray-900 dark:text-white font-semibold',
    };
  }
  
  return {
    eth: ethValue.toFixed(3),
    display: `${ethValue.toFixed(3)} ETH`,
    className: 'text-gray-900 dark:text-white font-bold text-lg',
  };
}

// Comprehensive auction state analyzer for UX
export function analyzeAuctionForUX(
  auction: AuctionData | null,
  ownershipState: OwnershipState,
  actionValidity: AuctionActionValidity,
  timeLeftMs: number
): {
  primaryAction?: {
    type: 'create' | 'bid' | 'end' | 'cancel';
    config: ReturnType<typeof getActionButtonConfig>;
  };
  secondaryActions: Array<{
    type: 'create' | 'bid' | 'end' | 'cancel';
    config: ReturnType<typeof getActionButtonConfig>;
  }>;
  status: {
    theme: typeof AUCTION_THEMES[keyof typeof AUCTION_THEMES];
    message: typeof AUCTION_STATUS_MESSAGES[keyof typeof AUCTION_STATUS_MESSAGES];
  };
  ownership: ReturnType<typeof getOwnershipMessage>;
  timeDisplay: ReturnType<typeof formatTimeWithUrgency>;
  recommendations: string[];
} {
  const auctionStatus = AuctionUtils.getAuctionStatus(auction);
  const timeDisplay = formatTimeWithUrgency(timeLeftMs);
  const ownership = getOwnershipMessage(ownershipState);
  
  // Determine status theme and message based on ACTUAL auction state
  let statusKey: keyof typeof AUCTION_STATUS_MESSAGES;
  
  // 🔥 FIXED: Use actual auction status, not ownership
  if (auctionStatus === 'live') {
    statusKey = 'live';
  } else if (auctionStatus === 'ended') {
    statusKey = 'ended';
  } else if (auctionStatus === 'settled') {
    statusKey = 'completed';
  } else {
    statusKey = 'none';
  }
  
  const status = {
    theme: AUCTION_THEMES[statusKey],
    message: AUCTION_STATUS_MESSAGES[statusKey],
  };
  
  // Determine primary and secondary actions
  const actions: Array<{
    type: 'create' | 'bid' | 'end' | 'cancel';
    config: ReturnType<typeof getActionButtonConfig>;
    priority: number;
  }> = [];
  
  if (actionValidity.canCreate) {
    actions.push({
      type: 'create',
      config: getActionButtonConfig('create', true),
      priority: 1,
    });
  }
  
  if (actionValidity.canBid) {
    actions.push({
      type: 'bid',
      config: getActionButtonConfig('bid', true),
      priority: 1,
    });
  }
  
  if (actionValidity.canEnd) {
    actions.push({
      type: 'end',
      config: getActionButtonConfig('end', true),
      priority: 1,
    });
  }
  
  if (actionValidity.canCancel) {
    actions.push({
      type: 'cancel',
      config: getActionButtonConfig('cancel', true),
      priority: 2,
    });
  }
  
  // Add disabled actions with reasons for better UX
  Object.entries(actionValidity.reasons).forEach(([actionType, reason]) => {
    const validActionType = actionType as 'create' | 'bid' | 'end' | 'cancel';
    if (reason && !actions.find(a => a.type === validActionType)) {
      actions.push({
        type: validActionType,
        config: getActionButtonConfig(validActionType, false, reason),
        priority: 3,
      });
    }
  });
  
  // Sort by priority and separate primary/secondary
  actions.sort((a, b) => a.priority - b.priority);
  const primaryAction = actions.find(a => a.priority === 1);
  const secondaryActions = actions.filter(a => a !== primaryAction);
  
  // Generate contextual recommendations
  const recommendations: string[] = [];
  
  if (ownershipState.isDirectOwner && !auction) {
    recommendations.push('💡 Create an auction to get competitive bids for your NFT');
  }
  
  if (auctionStatus === 'live' && !ownershipState.isAuctionSeller && timeDisplay.urgency === 'urgent') {
    recommendations.push('⚡ Auction ending soon! Place your bid quickly');
  }
  
  if (ownershipState.isAuctionSeller && auctionStatus === 'ended') {
    recommendations.push('🎯 End your auction to complete the sale or return your NFT');
  }
  
  if (ownershipState.isWinningBidder && auctionStatus === 'live') {
    recommendations.push('🏆 You have the winning bid! Watch for last-minute bidders');
  }
  
  return {
    primaryAction,
    secondaryActions,
    status,
    ownership,
    timeDisplay,
    recommendations,
  };
}
