import type { Address } from '@/lib/types/common';
import type { NftMetadata } from '@/lib/types/metadata';
import type { UiActivityItem } from '@/lib/types/activity';

export interface NftDetailProps {
  nft: Address;
  tokenId: string;
}

export interface NftImageProps {
  imgUrl: string | null;
  meta: NftMetadata | null;
  tokenId: string;
}

export interface NftInfoProps {
  meta: NftMetadata | null;
  tokenId: string;
  contractAddress: Address;
  price: bigint | null;
  isOwner: boolean;
  isForSale: boolean;
  activity:
    | {
        flat: UiActivityItem[]; // o arrays separados si los pintas por tipo
      }
    | { [key: string]: UiActivityItem[] }; // mantén compat si ya usas otro shape
  onBuyClick: () => void;
  isBuying: boolean;
}

export interface ActivityTabsProps {
  activity:
    | {
        flat: UiActivityItem[];
      }
    | { [key: string]: UiActivityItem[] };
}
