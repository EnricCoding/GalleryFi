import { ZERO_ADDRESS } from '@/config/contracts';

export type AuctionData = {
  seller: `0x${string}`;
  end: bigint; 
  bidder: `0x${string}`;
  bid: bigint;
};

export type AuctionStatus = 
  | 'none'           // No auction exists
  | 'live'           // Active auction
  | 'ended'          // Time expired, needs settlement
  | 'settled'        // Completed and settled
  | 'cancelled';     // Cancelled by seller

export type AuctionActionValidity = {
  canCreate: boolean;
  canBid: boolean;
  canEnd: boolean;
  canCancel: boolean;
  reasons: {
    create?: string;
    bid?: string;
    end?: string;
    cancel?: string;
  };
};

export type OwnershipState = {
  isDirectOwner: boolean;
  isInMarketplaceEscrow: boolean;
  isAuctionSeller: boolean;
  isWinningBidder: boolean;
  hasControlRights: boolean;  
  canViewAsOwner: boolean;    
};

export type AuctionTiming = {
  timeLeftMs: number;
  timeLeftSeconds: number;
  hasExpired: boolean;
  isUrgent: boolean; 
  isCritical: boolean;
  formattedTime: string;
};

// Utility functions
export class AuctionUtils {

  static isValidAuction(auction: AuctionData | null): auction is AuctionData {
    const isValid = !!(
      auction && 
      auction.seller &&
      auction.seller !== ZERO_ADDRESS &&
      auction.end > BigInt(0)
    );
    
    return isValid;
  }

 
  static getAuctionStatus(auction: AuctionData | null): AuctionStatus {
    if (!this.isValidAuction(auction)) {
      return 'none';
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const endTimeSec = Number(auction.end);

    if (endTimeSec > nowSec) {
      return 'live';
    } else {
      return 'ended';
    }
  }

  static getAuctionTiming(auction: AuctionData | null): AuctionTiming {
    if (!this.isValidAuction(auction)) {
      return {
        timeLeftMs: 0,
        timeLeftSeconds: 0,
        hasExpired: true,
        isUrgent: false,
        isCritical: false,
        formattedTime: 'No auction',
      };
    }

    const nowMs = Date.now();
    const endMs = Number(auction.end) * 1000;
    const timeLeftMs = Math.max(0, endMs - nowMs);
    const timeLeftSeconds = Math.floor(timeLeftMs / 1000);
    
    const hasExpired = timeLeftMs === 0;
    const isUrgent = timeLeftSeconds < 300; 
    const isCritical = timeLeftSeconds < 60;

    const formattedTime = this.formatTimeRemaining(timeLeftSeconds);

    return {
      timeLeftMs,
      timeLeftSeconds,
      hasExpired,
      isUrgent,
      isCritical,
      formattedTime,
    };
  }

  static formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return 'Ended';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  static getOwnershipState(
    userAddress: `0x${string}` | undefined,
    onchainOwner: `0x${string}` | undefined,
    marketplaceAddress: `0x${string}`,
    auction: AuctionData | null
  ): OwnershipState {
    if (!userAddress || !onchainOwner) {
      return {
        isDirectOwner: false,
        isInMarketplaceEscrow: false,
        isAuctionSeller: false,
        isWinningBidder: false,
        hasControlRights: false,
        canViewAsOwner: false,
      };
    }

    const isDirectOwner = userAddress.toLowerCase() === onchainOwner.toLowerCase();
    const isInMarketplaceEscrow = onchainOwner.toLowerCase() === marketplaceAddress.toLowerCase();
    
    const isAuctionSeller = this.isValidAuction(auction) && 
      userAddress.toLowerCase() === auction.seller.toLowerCase();
    
    const isWinningBidder = this.isValidAuction(auction) &&
      auction.bid > BigInt(0) &&
      userAddress.toLowerCase() === auction.bidder.toLowerCase();

    const hasControlRights = isDirectOwner || (isInMarketplaceEscrow && isAuctionSeller);
    
    const canViewAsOwner = isDirectOwner || isAuctionSeller;

    return {
      isDirectOwner,
      isInMarketplaceEscrow,
      isAuctionSeller,
      isWinningBidder,
      hasControlRights,
      canViewAsOwner,
    };
  }

  static validateAuctionActions(
    userAddress: `0x${string}` | undefined,
    auction: AuctionData | null,
    ownershipState: OwnershipState,
    isConnected: boolean
  ): AuctionActionValidity {
    const status = this.getAuctionStatus(auction);
    const timing = this.getAuctionTiming(auction);
    
    const result: AuctionActionValidity = {
      canCreate: false,
      canBid: false,
      canEnd: false,
      canCancel: false,
      reasons: {},
    };

    if (!isConnected) {
      result.reasons.create = 'Connect wallet to create auction';
      result.reasons.bid = 'Connect wallet to place bid';
      result.reasons.end = 'Connect wallet to end auction';
      result.reasons.cancel = 'Connect wallet to cancel auction';
      return result;
    }

    if (!userAddress) {
      result.reasons.create = 'Invalid user address';
      result.reasons.bid = 'Invalid user address';
      result.reasons.end = 'Invalid user address';
      result.reasons.cancel = 'Invalid user address';
      return result;
    }

    if (status === 'none') {
      if (ownershipState.isDirectOwner) {
        result.canCreate = true;
      } else {
        result.reasons.create = 'Only NFT owner can create auction';
      }
    } else {
      result.reasons.create = 'Auction already exists';
    }

    if (status === 'live') {
      if (ownershipState.isAuctionSeller) {
        result.reasons.bid = 'Cannot bid on your own auction';
      } else if (timing.hasExpired) {
        result.reasons.bid = 'Auction has ended';
      } else {
        result.canBid = true;
      }
    } else {
      result.reasons.bid = 'No active auction';
    }

    if (status === 'ended') {
      if (ownershipState.isAuctionSeller) {
        result.canEnd = true;
      } else {
        result.reasons.end = 'Only auction seller can end auction';
      }
    } else if (status === 'live' && timing.hasExpired) {
      if (ownershipState.isAuctionSeller) {
        result.canEnd = true;
      } else {
        result.reasons.end = 'Only auction seller can end auction';
      }
    } else {
      result.reasons.end = 'Auction not ready to end';
    }

    if (status === 'live') {
      if (!ownershipState.isAuctionSeller) {
        result.reasons.cancel = 'Only auction seller can cancel';
      } else if (this.isValidAuction(auction) && auction.bid > BigInt(0)) {
        result.reasons.cancel = 'Cannot cancel auction with bids';
      } else {
        result.canCancel = true;
      }
    } else {
      result.reasons.cancel = 'No active auction to cancel';
    }

    return result;
  }

  static getMinimumBid(currentBid: bigint, minIncrementWei: bigint): bigint {
    return currentBid > BigInt(0) ? currentBid + minIncrementWei : minIncrementWei;
  }

 
  static hasBids(auction: AuctionData | null): boolean {
    return this.isValidAuction(auction) && 
           auction.bid > BigInt(0) &&
           auction.bidder !== ZERO_ADDRESS;
  }
}
