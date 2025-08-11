export function ipfsToHttp(
  uri: string | null | undefined,
  gw = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'ipfs.io',
): string | null {
  if (!uri) return null;

  // Ya es un enlace HTTP o HTTPS → lo dejamos tal cual
  if (/^https?:\/\//i.test(uri)) return uri;

  // Es un enlace IPFS
  if (uri.startsWith('ipfs://')) {
    return `https://${gw}/ipfs/${uri.replace(/^ipfs:\/\//, '')}`;
  }

  // Caso raro: CID puro
  if (/^[a-zA-Z0-9]{46,}$/.test(uri)) {
    return `https://${gw}/ipfs/${uri}`;
  }

  return uri; // fallback
}