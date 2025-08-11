export interface Listing {
  id: string;
  nft: `0x${string}`;
  tokenId: string;      
  price: string;     
  seller: `0x${string}`;
  timestamp: string;    
  tokenURI?: string | null;
  name?: string | null;
  description?: string | null;
  image?: string | null;
}

export interface ListingsResponse {
  listings: Listing[];
}
