/**
 * Advanced UX System for Perfect User Understanding
 * Makes complex blockchain states crystal clear for any user
 */

import { type AuctionData, type OwnershipState } from '@/types/auction';
import { CONTRACTS } from '@/config/contracts';

// Enhanced ownership explanations that anyone can understand
export function getOwnershipExplanation(
  nftOwner: string,
  userAddress?: string,
  auction?: AuctionData | null,
  isListed?: boolean
): {
  primaryMessage: string;
  secondaryMessage: string;
  visualStatus: {
    icon: string;
    color: 'green' | 'blue' | 'orange' | 'gray';
    background: string;
  };
  explanation: {
    title: string;
    description: string;
    whatThisMeans: string;
    nextSteps?: string[];
  };
  confidence: 'high' | 'medium' | 'low';
  technicalNote?: {
    userAddress: string;
    nftOwner: string;
    isMarketplace: boolean;
  };
} {
  const isMarketplace = nftOwner.toLowerCase() === CONTRACTS.MARKETPLACE.toLowerCase();
  const isUserOwner = userAddress && nftOwner.toLowerCase() === userAddress.toLowerCase();
  
  // Case 1: User owns the NFT directly (not in marketplace)
  if (isUserOwner && !isMarketplace) {
    return {
      primaryMessage: "You own this NFT",
      secondaryMessage: "It's safely in your wallet",
      visualStatus: {
        icon: "🏠",
        color: "green",
        background: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      },
      explanation: {
        title: "This NFT is yours! 🎉",
        description: "You have full ownership and control of this NFT.",
        whatThisMeans: "The NFT is directly in your wallet. You can transfer it, list it for sale, or create an auction whenever you want.",
        nextSteps: [
          "List it for a fixed price sale",
          "Create an auction to let others bid",
          "Keep it in your collection",
          "Transfer it to another wallet"
        ]
      },
      confidence: "high"
    };
  }
  
  // Case 2: User's NFT is in auction (marketplace has it temporarily)
  if (isMarketplace && auction && auction.seller.toLowerCase() === userAddress?.toLowerCase()) {
    const timeLeft = Number(auction.end) * 1000 - Date.now();
    const hasActiveBids = auction.bid > BigInt(0);
    
    return {
      primaryMessage: "🎯 Your NFT is safely held during auction",
      secondaryMessage: hasActiveBids ? `Current bid: ${(Number(auction.bid) / 1e18).toFixed(3)} ETH` : "No bids yet - you still own it!",
      visualStatus: {
        icon: "🔒",
        color: "blue",
        background: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      },
      explanation: {
        title: "Your NFT is in secure marketplace escrow �️",
        description: "You created an auction, so your NFT was automatically moved to our secure smart contract for safety.",
        whatThisMeans: "This is completely normal! The marketplace holds your NFT in a secure 'escrow' while the auction runs. You're still the rightful owner - the NFT will either return to you (if no one bids) or be transferred to the winner (if someone buys it).",
        nextSteps: timeLeft > 0 ? [
          "Wait for the auction to end",
          "Monitor incoming bids",
          "You can cancel if no bids yet"
        ] : [
          "End the auction to finalize the sale",
          "Payment will be automatically processed"
        ]
      },
      confidence: "high",
      technicalNote: {
        userAddress: userAddress || "Not connected",
        nftOwner: nftOwner,
        isMarketplace: true
      }
    };
  }
  
  // Case 3: User's NFT is listed for fixed price sale
  if (isMarketplace && isListed && !auction) {
    return {
      primaryMessage: "Your NFT is listed for sale",
      secondaryMessage: "Waiting for a buyer",
      visualStatus: {
        icon: "🏷️",
        color: "orange",
        background: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
      },
      explanation: {
        title: "Your NFT is safely held during sale 🛡️",
        description: "When you list an NFT for sale, it's transferred to our marketplace contract for security.",
        whatThisMeans: "This protects both you and buyers. The marketplace ensures the NFT can't be moved while listed, and buyers know they'll definitely receive it after payment.",
        nextSteps: [
          "Wait for someone to buy it",
          "Update the price if needed",
          "Unlist it to get your NFT back",
          "Monitor for purchase notifications"
        ]
      },
      confidence: "high"
    };
  }
  
  // Case 4: Someone else's NFT in auction
  if (isMarketplace && auction && auction.seller.toLowerCase() !== userAddress?.toLowerCase()) {
    const timeLeft = Number(auction.end) * 1000 - Date.now();
    const isUserHighestBidder = userAddress && auction.bidder.toLowerCase() === userAddress.toLowerCase();
    
    return {
      primaryMessage: isUserHighestBidder ? "You're the highest bidder! 🥇" : "NFT is in auction",
      secondaryMessage: `By ${auction.seller.slice(0, 6)}...${auction.seller.slice(-4)}`,
      visualStatus: {
        icon: isUserHighestBidder ? "🏆" : "⚡",
        color: isUserHighestBidder ? "green" : "blue",
        background: isUserHighestBidder 
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      },
      explanation: {
        title: isUserHighestBidder 
          ? "You're winning this auction! 🎉" 
          : "This NFT is being auctioned",
        description: "The owner has put this NFT up for auction. The marketplace holds it securely until the auction ends.",
        whatThisMeans: isUserHighestBidder
          ? "If no one outbids you before the auction ends, you'll win this NFT! The payment will be automatically processed."
          : "You can place a bid to try to win this NFT. The highest bidder when the auction ends will receive it.",
        nextSteps: timeLeft > 0 ? (isUserHighestBidder ? [
          "Wait for the auction to end",
          "Monitor for higher bids",
          "Prepare to receive your NFT!"
        ] : [
          "Place a bid to participate",
          "Monitor the auction progress",
          "Bid higher if someone outbids you"
        ]) : [
          "Auction has ended",
          "Winner will receive the NFT automatically"
        ]
      },
      confidence: "high"
    };
  }
  
  // Case 5: Someone else owns it directly
  if (!isMarketplace && !isUserOwner) {
    return {
      primaryMessage: "Owned by another user",
      secondaryMessage: `${nftOwner.slice(0, 6)}...${nftOwner.slice(-4)}`,
      visualStatus: {
        icon: "👤",
        color: "gray",
        background: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
      },
      explanation: {
        title: "This NFT belongs to someone else",
        description: "Another user currently owns this NFT and has it in their personal wallet.",
        whatThisMeans: "The NFT is not for sale and is not in any marketplace. Only the owner can decide to list it or create an auction.",
        nextSteps: [
          "Check back later to see if they list it",
          "Look for similar NFTs in the marketplace",
          "Follow this NFT to get notified of changes"
        ]
      },
      confidence: "high"
    };
  }
  
  // Fallback case (shouldn't happen, but just in case)
  return {
    primaryMessage: "Ownership status unclear",
    secondaryMessage: "Please refresh the page",
    visualStatus: {
      icon: "🔄",
      color: "gray",
      background: "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
    },
    explanation: {
      title: "We're having trouble determining ownership",
      description: "There might be a temporary issue loading the ownership information.",
      whatThisMeans: "This is unusual. Try refreshing the page or check your internet connection.",
      nextSteps: [
        "Refresh the page",
        "Check your wallet connection",
        "Try again in a few moments"
      ]
    },
    confidence: "low"
  };
}

// Smart recommendations based on user situation
export function getSmartRecommendations(
  ownershipState: OwnershipState,
  auction?: AuctionData | null,
  userAddress?: string
): {
  primary: string;
  secondary: string[];
  urgent?: string;
} {
  // For NFT owners
  if (ownershipState.canViewAsOwner) {
    if (auction) {
      const timeLeft = Number(auction.end) * 1000 - Date.now();
      const hasActiveBids = auction.bid > BigInt(0);
      
      if (timeLeft < 300000 && hasActiveBids) { // Less than 5 minutes
        return {
          primary: "🚨 Your auction is ending soon!",
          secondary: [
            "The winning bidder will automatically receive your NFT",
            "Payment will be processed immediately after auction ends",
            "No action needed from you"
          ],
          urgent: "Auction ends in less than 5 minutes"
        };
      }
      
      if (!hasActiveBids && timeLeft < 3600000) { // Less than 1 hour, no bids
        return {
          primary: "💡 Consider adjusting your auction",
          secondary: [
            "No bids yet - you might want to cancel and restart",
            "Try setting a lower starting price",
            "Share your auction on social media"
          ]
        };
      }
      
      return {
        primary: "📈 Your auction is running smoothly",
        secondary: [
          "Monitor for incoming bids",
          "Share the auction to get more visibility",
          "Be patient - good NFTs sell!"
        ]
      };
    }
    
    return {
      primary: "🎯 Ready to monetize your NFT?",
      secondary: [
        "Create an auction for potentially higher returns",
        "Set a fixed price for quick sale",
        "Hold it in your collection"
      ]
    };
  }
  
  // For potential buyers
  if (auction) {
    const timeLeft = Number(auction.end) * 1000 - Date.now();
    const isUserHighestBidder = userAddress && auction.bidder.toLowerCase() === userAddress.toLowerCase();
    
    if (isUserHighestBidder) {
      if (timeLeft < 300000) {
        return {
          primary: "🏆 You're about to win!",
          secondary: [
            "Keep an eye out for last-minute bids",
            "Prepare to receive your NFT soon",
            "Payment will be processed automatically"
          ],
          urgent: "Less than 5 minutes left!"
        };
      }
      
      return {
        primary: "🥇 You're currently winning",
        secondary: [
          "Monitor for competing bids",
          "Consider placing a higher bid for safety",
          "Stay alert until auction ends"
        ]
      };
    }
    
    return {
      primary: "⚡ Join the auction",
      secondary: [
        "Place a bid to participate",
        "Act quickly - auctions can end suddenly",
        "Make sure you really want this NFT"
      ]
    };
  }
  
  return {
    primary: "🔍 Explore the marketplace",
    secondary: [
      "Look for NFTs currently for sale",
      "Check out active auctions",
      "Create your own NFT collection"
    ]
  };
}

// Progressive disclosure - show more details when needed
export function getDetailedExplanation(situation: string): {
  title: string;
  sections: Array<{
    heading: string;
    content: string;
    icon: string;
  }>;
} {
  switch (situation) {
    case 'marketplace_escrow':
      return {
        title: "Understanding Marketplace Escrow",
        sections: [
          {
            heading: "What is escrow?",
            content: "Escrow is like a secure safe that holds your NFT during sales. It protects both buyers and sellers by ensuring the NFT can't be moved until the transaction is complete.",
            icon: "🔒"
          },
          {
            heading: "Is my NFT safe?",
            content: "Absolutely! Your NFT is held by a smart contract (computer program) that automatically follows the rules. No human can access or steal it.",
            icon: "🛡️"
          },
          {
            heading: "When do I get it back?",
            content: "If your auction ends with no bids, you get it back immediately. If someone wins, they get the NFT and you get paid automatically.",
            icon: "⏰"
          }
        ]
      };
    
    default:
      return {
        title: "NFT Marketplace Guide",
        sections: [
          {
            heading: "Buying NFTs",
            content: "You can buy NFTs at fixed prices or participate in auctions. Auctions might get you a better deal, but fixed prices are instant.",
            icon: "🛒"
          },
          {
            heading: "Selling NFTs",
            content: "List your NFTs for a fixed price or create an auction. Auctions can sometimes get higher prices due to bidding competition.",
            icon: "💰"
          }
        ]
      };
  }
}
