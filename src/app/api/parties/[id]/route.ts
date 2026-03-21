/**
 * PATCH  /api/parties/:id — 파티 이름 수정
 * DELETE /api/parties/:id — 파티 삭제
 *
 * 참고: 이 파일의 핸들러는 두 번째 인자(params)를 받아야 하므로
 * withRateLimit 래퍼 대신 checkRateLimit를 직접 사용합니다.
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

/** 파티 소유권 확인 — 404/403 시 에러 응답 반환, 정상이면 null */
async function verifyOwnership(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  partyId: string,
  userId: string,
  action: "수정" | "삭제",
): Promise<NextResponse | null> {
  const { data: existing, error: fetchError } = await supabase
    .from("saved_parties")
    .select("id, user_id")
    .eq("id", partyId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "파티를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (existing.user_id !== userId) {
    return NextResponse.json(
      { error: `본인의 파티만 ${action}할 수 있습니다.` },
      { status: 403 },
    );
  }

  return null;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    const body = await request.json();
    const { name } = body as { name: unknown };

    // name 검증
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "파티 이름을 입력해주세요." },
        { status: 400 },
      );
    }
    if (name.length < 1 || name.length > 50) {
      return NextResponse.json(
        { error: "파티 이름은 1~50자여야 합니다." },
        { status: 400 },
      );
    }

    // 소유자 확인 (RLS가 처리하지만 서버에서도 확인)
    const ownerError = await verifyOwnership(supabase, id, user.id, "수정");
    if (ownerError) return ownerError;

    // 수정
    const { data: updated, error: updateError } = await supabase
      .from("saved_parties")
      .update({ name: name.trim() })
      .eq("id", id)
      .select("id, name, updated_at")
      .single();

    if (updateError) {
      console.error("파티 수정 오류:", updateError);
      return NextResponse.json(
        { error: "파티 수정 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("파티 수정 API 오류:", error);
    const message = getApiErrorMessage(error, "파티 수정 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(_request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    // 소유자 확인
    const ownerError = await verifyOwnership(supabase, id, user.id, "삭제");
    if (ownerError) return ownerError;

    // 삭제
    const { error: deleteError } = await supabase
      .from("saved_parties")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("파티 삭제 오류:", deleteError);
      return NextResponse.json(
        { error: "파티 삭제 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("파티 삭제 API 오류:", error);
    const message = getApiErrorMessage(error, "파티 삭제 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
