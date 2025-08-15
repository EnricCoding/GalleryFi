// hooks/useNftMetadata.ts
'use client';

import { useEffect, useState } from 'react';
import { ipfsToHttp } from '@/lib/ipfs';

export interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type?: string; value?: string | number }>;
}

export function useNftMetadata(tokenURI: string | null) {
  const [meta, setMeta] = useState<NftMetadata | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!tokenURI) {
          if (!cancelled) {
            setMeta(null);
            setImgUrl(null);
          }
          return;
        }
        const url = ipfsToHttp(tokenURI);
        if (!url) {
          if (!cancelled) {
            setMeta(null);
            setImgUrl(null);
          }
          return;
        }
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) {
          if (!cancelled) {
            setMeta(null);
            setImgUrl(null);
          }
          return;
        }
        const json = (await res.json()) as NftMetadata;
        if (!cancelled) {
          setMeta(json);
          const raw = json?.image;
          const resolved = raw ? (raw.startsWith('ipfs://') ? ipfsToHttp(raw) : raw) : null;
          setImgUrl(resolved || null);
        }
      } catch {
        if (!cancelled) {
          setMeta(null);
          setImgUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenURI]);

  return { meta, imgUrl };
}
