/**
 * 간단한 in-memory rate limiter (슬라이딩 윈도우)
 * 프로덕션에서는 Redis 기반으로 교체 권장
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60_000; // 1분
const MAX_REQUESTS = 20; // 1분에 최대 20회

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = requestCounts.get(identifier);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "anonymous";
}
