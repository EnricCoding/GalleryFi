/**
 * Centralized contract configuration
 * Single source of truth for all blockchain-related constants
 */

/**
 * Centralized contract configuration
 * Single source of truth for all blockchain-related constants
 */

/**
 * Centralized contract configuration
 * Single source of truth for all blockchain-related constants
 */

// More robust environment validation
function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  
  if (value) {
    return value;
  }
  
  if (fallback) {
    return fallback;
  }
  
  // Debug info in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`❌ Missing environment variable: ${key}`);
    console.error(`📝 Available NEXT_PUBLIC_ vars:`, 
      Object.keys(process.env)
        .filter(k => k.startsWith('NEXT_PUBLIC_'))
        .map(k => `${k}=${process.env[k]?.slice(0, 10)}...`)
    );
    console.error(`💡 Restart your dev server: npm run dev`);
  }
  
  throw new Error(`Missing required environment variable: ${key}. Restart your development server.`);
}

// Core contract addresses with robust fallbacks
export const CONTRACTS = {
  MARKETPLACE: getEnvVar('NEXT_PUBLIC_MARKET_ADDRESS', '0x5e3ef51F0a662dF65dea3e115C689E0cDE2A0F37') as `0x${string}`,
  NFT: getEnvVar('NEXT_PUBLIC_NFT_ADDRESS', '0xfd6580707778bE0d6Fc1447Ff42237e29a7cb047') as `0x${string}`,
} as const;

// Network configuration
export const NETWORK = {
  CHAIN_ID: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111'), // Default to Sepolia
  EXPECTED_CHAIN_NAME: process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'Sepolia',
} as const;

// Auction configuration
export const AUCTION_CONFIG = {
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 168, // 1 week
  DEFAULT_DURATION_HOURS: 24,
  MIN_BID_INCREMENT_ETH: '0.001',
  REFETCH_INTERVAL_MS: 30000, // 30 seconds
  REALTIME_UPDATE_INTERVAL_MS: 1000, // 1 second for countdown
  STALE_TIME_MS: 15000, // Consider data fresh for 15 seconds
  GC_TIME_MS: 60000, // Keep in cache for 1 minute
} as const;

// Duration presets for UI
export const DURATION_PRESETS = {
  '1': { hours: 1, label: '1 Hour' },
  '3': { hours: 3, label: '3 Hours' },
  '6': { hours: 6, label: '6 Hours' },
  '12': { hours: 12, label: '12 Hours' },
  '24': { hours: 24, label: '1 Day' },
  '72': { hours: 72, label: '3 Days' },
  '168': { hours: 168, label: '1 Week' },
} as const;

// Constants
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// Helper functions
export const isZeroAddress = (address: string): boolean => 
  address === ZERO_ADDRESS;

export const isValidAddress = (address: string): address is `0x${string}` =>
  /^0x[a-fA-F0-9]{40}$/.test(address) && address !== ZERO_ADDRESS;

export const isValidMarketplace = (address: string | undefined): boolean =>
  !!address && isValidAddress(address) && address === CONTRACTS.MARKETPLACE;

// Contract validation
export const validateContracts = () => {
  if (!isValidAddress(CONTRACTS.MARKETPLACE)) {
    throw new Error(`Invalid marketplace address: ${CONTRACTS.MARKETPLACE}`);
  }
  if (!isValidAddress(CONTRACTS.NFT)) {
    throw new Error(`Invalid NFT address: ${CONTRACTS.NFT}`);
  }
};

// Initialize validation on import
validateContracts();
