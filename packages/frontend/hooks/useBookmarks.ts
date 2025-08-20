'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type BookmarkItem = {
  nft: `0x${string}`;
  tokenId: string;
  name?: string | null;
  image?: string | null;
  addedAt: number;
};

const STORAGE_KEY = 'nft-bookmarks:v1';

function load(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookmarkItem[]) : [];
  } catch {
    return [];
  }
}
function save(list: BookmarkItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* noop */
  }
}

export function useBookmarks(nft?: `0x${string}`, tokenId?: string) {
  const [items, setItems] = useState<BookmarkItem[]>([]);

  useEffect(() => {
    setItems(load());
  }, []);

  const isBookmarked = useMemo(() => {
    if (!nft || !tokenId) return false;
    return items.some((it) => it.nft.toLowerCase() === nft.toLowerCase() && it.tokenId === tokenId);
  }, [items, nft, tokenId]);

  const addBookmark = useCallback((item: BookmarkItem) => {
    setItems((prev) => {
      const exists = prev.some(
        (p) => p.nft.toLowerCase() === item.nft.toLowerCase() && p.tokenId === item.tokenId,
      );
      if (exists) return prev;
      const next = [{ ...item, addedAt: Date.now() }, ...prev].slice(0, 100); // límite opcional
      save(next);
      return next;
    });
  }, []);

  const removeBookmark = useCallback((nftAddr: `0x${string}`, id: string) => {
    setItems((prev) => {
      const next = prev.filter(
        (p) => !(p.nft.toLowerCase() === nftAddr.toLowerCase() && p.tokenId === id),
      );
      save(next);
      return next;
    });
  }, []);

  const toggleBookmark = useCallback((item: BookmarkItem) => {
    setItems((prev) => {
      const match = (p: BookmarkItem) =>
        p.nft.toLowerCase() === item.nft.toLowerCase() && p.tokenId === item.tokenId;
      const exists = prev.some(match);
      const next = exists
        ? prev.filter((p) => !match(p))
        : [{ ...item, addedAt: Date.now() }, ...prev];
      save(next);
      return next;
    });
  }, []);

  return { items, isBookmarked, addBookmark, removeBookmark, toggleBookmark };
}
