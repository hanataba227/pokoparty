/**
 * POST /api/shared/:id/like — 좋아요 토글 (좋아요 / 좋아요 취소)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { getApiErrorMessage } from "@/lib/api-error";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** rate limit 체크 헬퍼 — 초과 시 429 응답을 반환, 허용 시 null */
function enforceRateLimit(request: NextRequest): NextResponse | null {
  const { allowed } = checkRateLimit(getRateLimitKey(request));
  if (!allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" } },
    );
  }
  return null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    // --- 공유 파티 존재 확인 ---
    const { data: sharedParty, error: fetchError } = await supabase
      .from("shared_parties")
      .select("id, like_count")
      .eq("id", id)
      .single();

    if (fetchError || !sharedParty) {
      return NextResponse.json(
        { error: "공유 파티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // --- 이미 좋아요 했는지 확인 ---
    const { data: existingLike } = await supabase
      .from("shared_party_likes")
      .select("shared_party_id")
      .eq("shared_party_id", id)
      .eq("user_id", user.id)
      .single();

    let liked: boolean;
    let newLikeCount: number;

    if (existingLike) {
      // 좋아요 취소
      await supabase
        .from("shared_party_likes")
        .delete()
        .eq("shared_party_id", id)
        .eq("user_id", user.id);

      newLikeCount = Math.max(0, (sharedParty.like_count ?? 0) - 1);
      await supabase
        .from("shared_parties")
        .update({ like_count: newLikeCount })
        .eq("id", id);

      liked = false;
    } else {
      // 좋아요
      const { error: likeError } = await supabase
        .from("shared_party_likes")
        .insert({
          shared_party_id: id,
          user_id: user.id,
        });

      if (likeError) {
        console.error("좋아요 등록 오류:", likeError);
        return NextResponse.json(
          { error: "좋아요 처리 중 오류가 발생했습니다." },
          { status: 500 },
        );
      }

      newLikeCount = (sharedParty.like_count ?? 0) + 1;
      await supabase
        .from("shared_parties")
        .update({ like_count: newLikeCount })
        .eq("id", id);

      liked = true;
    }

    return NextResponse.json({ liked, like_count: newLikeCount });
  } catch (error) {
    console.error("좋아요 API 오류:", error);
    const message = getApiErrorMessage(error, "좋아요 처리 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
