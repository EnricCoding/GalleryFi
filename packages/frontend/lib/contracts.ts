import { fromHex } from 'viem';

export function extractTokenIdFromLogs(
  nftAddress: `0x${string}`,
  logs: ReadonlyArray<{ address: `0x${string}`; topics: readonly `0x${string}`[] }>,
): bigint {
  const TRANSFER_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const log = logs.find(
    (l) => l.address.toLowerCase() === nftAddress.toLowerCase() && l.topics?.[0] === TRANSFER_SIG,
  );
  if (!log || !log.topics[3]) throw new Error('No se encontró Transfer(tokenId) en logs.');
  return fromHex(log.topics[3], 'bigint');
}
