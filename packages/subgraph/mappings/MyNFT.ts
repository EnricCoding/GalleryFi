import { Address } from '@graphprotocol/graph-ts';
import { Transfer } from '../generated/MyNFT/MyNFT';
import { Mint } from '../generated/schema';
import { ERC721 } from '../generated/MyNFT/ERC721';

const ZERO = Address.fromString('0x0000000000000000000000000000000000000000');

export function handleTransfer(event: Transfer): void {
  // Solo tratamos como mint cuando el emisor es la zero address
  if (event.params.from != ZERO) return;

  const id = event.params.tokenId.toHex();
  const entity = new Mint(id);
  entity.nft = event.address;
  entity.tokenId = event.params.tokenId;
  entity.to = event.params.to;

  // Intentar obtener tokenURI directamente del contrato
  const nftContract = ERC721.bind(event.address);
  const tokenUriResult = nftContract.try_tokenURI(event.params.tokenId);
  if (!tokenUriResult.reverted) {
    entity.tokenURI = tokenUriResult.value;
  } else {
    entity.tokenURI = '';
  }

  entity.timestamp = event.block.timestamp;
  entity.save();
}
