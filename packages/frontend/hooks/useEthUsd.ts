'use client';

import { useEffect, useState } from 'react';
import { getEthToUsdPrice } from '@/lib/price';

export function useEthUsd() {
  const [ethUsd, setEthUsd] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getEthToUsdPrice();
        if (!cancelled) setEthUsd(p);
      } catch {
        if (!cancelled) setEthUsd(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ethUsd };
}
