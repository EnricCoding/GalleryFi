import {
  ItemListed,
  ItemSold,
  BidPlaced,
  AuctionCreated,
  AuctionEnded,
} from '../generated/NftMarketplace/NftMarketplace';
import { ERC721 } from '../generated/NftMarketplace/ERC721';
import { Listing, Sale, Bid, AuctionCreated as AC, AuctionEnded as AE } from '../generated/schema';

export function handleItemListed(e: ItemListed): void {
  const id = e.address.toHex() + '-' + e.params.id.toString();
  const l = new Listing(id);
  l.nft = e.params.nft;
  l.tokenId = e.params.id;
  l.seller = e.params.seller;
  l.price = e.params.price;
  l.timestamp = e.block.timestamp;

  // Vinculamos el contrato ERC721 para acceder al tokenURI
  const nftContract = ERC721.bind(e.params.nft);
  const tokenUriResult = nftContract.try_tokenURI(e.params.id);
  if (!tokenUriResult.reverted) {
    l.tokenURI = tokenUriResult.value;

    /**
     * NOTA:
     * The Graph no puede hacer fetch a IPFS/HTTP en tiempo de indexación,
     * por lo que aquí solo guardamos el tokenURI.
     * El front deberá usar este tokenURI para obtener:
     *  - name
     *  - description
     *  - image
     *
     * Si tus metadatos están en IPFS y el tokenURI comienza con ipfs://,
     * el front debe reemplazarlo por un gateway HTTP como:
     * https://ipfs.io/ipfs/<CID>
     */
  }

  // Inicializamos estos campos como null, para que el front los rellene
  l.name = null;
  l.description = null;
  l.image = null;

  l.save();
}

export function handleItemSold(e: ItemSold): void {
  const id = e.address.toHex() + '-' + e.transaction.hash.toHex();
  const s = new Sale(id);
  s.nft = e.params.nft;
  s.tokenId = e.params.id;
  s.buyer = e.params.buyer;
  s.price = e.params.price;
  s.timestamp = e.block.timestamp;
  s.save();
}

export function handleBidPlaced(e: BidPlaced): void {
  const id = e.transaction.hash.toHex() + '-' + e.logIndex.toString();
  const b = new Bid(id);
  b.nft = e.params.nft;
  b.tokenId = e.params.id;
  b.bidder = e.params.bidder;
  b.amount = e.params.amount;
  b.timestamp = e.block.timestamp;
  b.save();
}

export function handleAuctionCreated(e: AuctionCreated): void {
  const id = e.address.toHex() + '-' + e.params.id.toString();
  const a = new AC(id);
  a.nft = e.params.nft;
  a.tokenId = e.params.id;
  a.seller = e.transaction.from;
  a.end = e.params.end;
  a.timestamp = e.block.timestamp;
  a.save();
}

export function handleAuctionEnded(e: AuctionEnded): void {
  const id = e.address.toHex() + '-' + e.params.id.toString();
  const a = new AE(id);
  a.nft = e.params.nft;
  a.tokenId = e.params.id;
  a.winner = e.params.winner;
  a.amount = e.params.amount;
  a.timestamp = e.block.timestamp;
  a.save();
}
