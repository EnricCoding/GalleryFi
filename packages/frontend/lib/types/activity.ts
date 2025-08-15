import type { Address } from './common';
import type { SgListing, SgSale, SgBid, SgAuctionCreated, SgAuctionEnded } from './subgraph';

export type UiActivityItem =
  | { id: string; type: 'SALE'; price: string; to: Address; timestamp: string }
  | { id: string; type: 'BID'; price: string; from: Address; timestamp: string }
  | { id: string; type: 'LISTING'; price: string; from: Address; timestamp: string };

export interface UiActivity {
  latestListing: SgListing | null;
  sales: SgSale[];
  bids: SgBid[];
  auction?: {
    created?: SgAuctionCreated | null;
    ended?: SgAuctionEnded | null;
  };
  flat: UiActivityItem[];
}

export type HexAddress = `0x${string}`;

export type NftActivity =
  | {
      id: string;
      activityType: 'SALE';
      price: string;
      to: HexAddress;
      timestamp: string;
      from?: HexAddress;
    }
  | {
      id: string;
      activityType: 'BID';
      price: string;
      from: HexAddress;
      timestamp: string;
      to?: HexAddress;
    }
  | {
      id: string;
      activityType: 'LISTING';
      price: string;
      from: HexAddress;
      timestamp: string;
      to?: HexAddress;
    }
  | {
      id: string;
      activityType: 'TRANSFER';
      from?: HexAddress;
      to?: HexAddress;
      timestamp: string;
      price?: string;
    };
