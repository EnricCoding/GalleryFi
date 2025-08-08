import { Address } from '@graphprotocol/graph-ts';
import { Transfer } from '../generated/MyNFT/MyNFT';
import { Mint } from '../generated/schema';

const ZERO = Address.fromString('0x0000000000000000000000000000000000000000');

export function handleTransfer(event: Transfer): void {
  // Solo tratamos como mint cuando el emisor es la zero address
  if (event.params.from != ZERO) return;

  const id = event.params.tokenId.toHex(); // o .toString()
  const entity = new Mint(id);
  entity.nft = event.address;
  entity.tokenId = event.params.tokenId;
  entity.to = event.params.to;
  entity.tokenURI = ''; // (opcional) podrías llamar a tokenURI()
  entity.timestamp = event.block.timestamp;
  entity.save();
}
