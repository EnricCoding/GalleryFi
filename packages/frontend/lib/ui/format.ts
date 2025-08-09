// lib/ui/format.ts
import { formatEther } from 'viem';

export const formatEth = (wei: string): string => {
  try {
    return formatEther(BigInt(wei));
  } catch {
    return '0';
  }
};

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const timeAgo = (unixSecStr: string) => {
  const now = Date.now();
  const then = Number(unixSecStr) * 1000;
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};
