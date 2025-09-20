export function ipfsToHttp(
  uri: string | null | undefined,
  gw = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'ipfs.io',
): string | null {
  if (!uri) return null;

  if (/^https?:\/\//i.test(uri)) return uri;

  if (uri.startsWith('ipfs://')) {
    return `https://${gw}/ipfs/${uri.replace(/^ipfs:\/\//, '')}`;
  }

  if (/^[a-zA-Z0-9]{46,}$/.test(uri)) {
    return `https://${gw}/ipfs/${uri}`;
  }

  return uri; 
}