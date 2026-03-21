/**
 * 간단한 in-memory 클라이언트 캐시 유틸리티
 * SWR/React Query 없이 페이지 이동 시 API 재요청 방지
 *
 * TTL: 기본 5분
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5분

/**
 * 캐시에서 데이터 조회. 만료 시 null 반환.
 */
export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * 캐시에 데이터 저장.
 */
export function cacheSet<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * 캐시 래퍼: 캐시 히트 시 캐시 반환, 아니면 fetcher 실행 후 캐시 저장.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;

  const data = await fetcher();
  cacheSet(key, data, ttlMs);
  return data;
}
