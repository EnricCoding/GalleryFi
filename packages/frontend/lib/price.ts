export interface PriceData {
  ethereum: {
    usd: number;
  };
}

let cachedPrice: number | null = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function getEthToUsdPrice(): Promise<number> {
  const now = Date.now();
  
  if (cachedPrice && (now - lastFetch) < CACHE_DURATION) {
    return cachedPrice;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        next: { revalidate: 300 }, 
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PriceData = await response.json();
    const price = data.ethereum.usd;
    
    cachedPrice = price;
    lastFetch = now;
    
    return price;
  } catch (error) {
    console.warn('Failed to fetch ETH price:', error);
    
    if (cachedPrice) {
      return cachedPrice;
    }
    
    return 2450;
  }
}

export function formatUsdPrice(ethAmount: string, ethPriceUsd: number): string {
  try {
    const ethValue = parseFloat(ethAmount);
    if (isNaN(ethValue)) return '~$0 USD';
    
    const usdValue = ethValue * ethPriceUsd;
    
    if (usdValue >= 1000000) {
      return `~$${(usdValue / 1000000).toFixed(1)}M USD`;
    } else if (usdValue >= 1000) {
      return `~$${(usdValue / 1000).toFixed(1)}K USD`;
    } else if (usdValue >= 1) {
      return `~$${usdValue.toFixed(0)} USD`;
    } else {
      return `~$${usdValue.toFixed(2)} USD`;
    }
  } catch {
    return '~$0 USD';
  }
}
