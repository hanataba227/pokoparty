/**
 * Rate limiter (in-memory + Upstash Redis 선택적 사용)
 *
 * 환경변수 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN이 설정되면
 * Upstash Redis REST API를 사용하고, 없으면 기존 in-memory 폴백 유지.
 */
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// In-memory rate limiter (슬라이딩 윈도우)
// ---------------------------------------------------------------------------

const requestCounts = new Map<string, { count: number; resetTime: number }>();

const DEFAULT_WINDOW_MS = 60_000; // 1분
const DEFAULT_MAX_REQUESTS = 20; // 1분에 최대 20회

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
}

/** 만료된 엔트리 정리 주기 (100회 체크마다 1회) */
let checkCounter = 0;
const CLEANUP_INTERVAL = 100;

/**
 * 만료된 엔트리를 정리하여 Map 무한 증가 방지
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of requestCounts) {
    if (now > entry.resetTime) {
      requestCounts.delete(key);
    }
  }
}

export function checkRateLimit(
  identifier: string,
  config?: RateLimitConfig,
): { allowed: boolean; remaining: number } {
  const windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = config?.maxRequests ?? DEFAULT_MAX_REQUESTS;

  // 주기적으로 만료 엔트리 정리
  checkCounter++;
  if (checkCounter >= CLEANUP_INTERVAL) {
    checkCounter = 0;
    cleanupExpiredEntries();
  }

  const now = Date.now();
  const entry = requestCounts.get(identifier);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter (REST API, fetch 전용)
// ---------------------------------------------------------------------------

/**
 * Upstash Redis REST API를 fetch로 호출하여 INCR + PEXPIRE 파이프라인 실행
 */
async function upstashIncr(
  key: string,
  windowMs: number,
): Promise<{ count: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, windowMs],
    ]),
  });

  if (!response.ok) {
    throw new Error(`Upstash Redis error: ${response.status}`);
  }

  const results: Array<{ result: number }> = await response.json();
  return { count: results[0].result };
}

/**
 * Upstash 기반 비동기 rate limit 체크
 */
async function checkRateLimitAsync(
  identifier: string,
  config?: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number }> {
  const windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = config?.maxRequests ?? DEFAULT_MAX_REQUESTS;

  const key = `rate-limit:${identifier}`;
  const { count } = await upstashIncr(key, windowMs);

  const allowed = count <= maxRequests;
  const remaining = allowed ? maxRequests - count : 0;
  return { allowed, remaining };
}

// ---------------------------------------------------------------------------
// 공통 유틸
// ---------------------------------------------------------------------------

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "anonymous";
}

/**
 * Rate limit 래퍼 함수
 * API 핸들러를 감싸서 rate limit 보일러플레이트를 제거
 *
 * UPSTASH_REDIS_REST_URL 환경변수가 있으면 Redis 기반,
 * 없으면 기존 in-memory 폴백 사용.
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    let allowed: boolean;
    let remaining: number;

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const result = await checkRateLimitAsync(getRateLimitKey(request), config);
        allowed = result.allowed;
        remaining = result.remaining;
      } catch {
        // Redis 장애 시 in-memory 폴백
        const result = checkRateLimit(getRateLimitKey(request), config);
        allowed = result.allowed;
        remaining = result.remaining;
      }
    } else {
      const result = checkRateLimit(getRateLimitKey(request), config);
      allowed = result.allowed;
      remaining = result.remaining;
    }

    if (!allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" } },
      );
    }

    const response = await handler(request);

    // remaining 헤더 추가
    response.headers.set("X-RateLimit-Remaining", String(remaining));

    return response;
  };
}
