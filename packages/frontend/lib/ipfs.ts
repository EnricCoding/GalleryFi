export function ipfsToHttp(uri: string, gw = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'ipfs.io') {
  return `https://${gw}/ipfs/${uri.replace(/^ipfs:\/\//, '')}`;
}
