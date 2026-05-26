import type { ProductSearchResponse } from "@/lib/types";

const TTL_MS = 60_000;
const MAX_ENTRIES = 50;

interface Entry { ts: number; data: ProductSearchResponse }

const cache = new Map<string, Entry>();

function buildKey(q: string, limit: number) {
  return `${q.trim().toLowerCase()}|${limit}`;
}

export function getCachedSearch(q: string, limit: number): ProductSearchResponse | null {
  const key = buildKey(q, limit);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    cache.delete(key);
    return null;
  }
  // refresh LRU position
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

export function setCachedSearch(q: string, limit: number, data: ProductSearchResponse) {
  const key = buildKey(q, limit);
  cache.set(key, { ts: Date.now(), data });
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export function clearProductSearchCache() {
  cache.clear();
}
