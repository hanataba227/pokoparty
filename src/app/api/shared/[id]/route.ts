/**
 * GET    /api/shared/:id — 공유 파티 상세 (비로그인 접근 가능)
 * DELETE /api/shared/:id — 공유 취소 (본인만)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { getApiErrorMessage } from "@/lib/api-error";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { loadPokemonData, loadAllPokemonNames } from "@/lib/data-loader";

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const supabase = await createServerSupabase();

    // 공유 파티 조회 (RLS: 누구나 SELECT 가능)
    const { data: shared, error: fetchError } = await supabase
      .from("shared_parties")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !shared) {
      return NextResponse.json(
        { error: "공유 파티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 포켓몬 상세 정보 조립
    const allPokemon = loadPokemonData();
    const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));
    const allNames = loadAllPokemonNames();

    const pokemonIds: number[] = shared.pokemon_ids;
    const pokemonDetails = pokemonIds.map((pid) => {
      const p = pokemonMap.get(pid);
      return {
        id: pid,
        name_ko: allNames.get(pid) ?? `#${pid}`,
        types: p?.types ?? [],
      };
    });

    // 로그인 유저 확인 (선택적 — 실패해도 무시)
    let isLiked = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: like } = await supabase
          .from("shared_party_likes")
          .select("shared_party_id")
          .eq("shared_party_id", id)
          .eq("user_id", user.id)
          .single();
        isLiked = !!like;
      }
    } catch {
      // 비로그인 — 무시
    }

    return NextResponse.json({
      party: {
        ...shared,
        is_liked: isLiked,
      },
      pokemon_details: pokemonDetails,
    });
  } catch (error) {
    console.error("공유 파티 상세 조회 API 오류:", error);
    const message = getApiErrorMessage(error, "공유 파티 정보를 불러오는 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    // 공유 파티 존재 + 소유자 확인
    const { data: existing, error: fetchError } = await supabase
      .from("shared_parties")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "공유 파티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "본인의 공유 파티만 삭제할 수 있습니다." },
        { status: 403 },
      );
    }

    // 삭제
    const { error: deleteError } = await supabase
      .from("shared_parties")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("공유 파티 삭제 오류:", deleteError);
      return NextResponse.json(
        { error: "공유 파티 삭제 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("공유 파티 삭제 API 오류:", error);
    const message = getApiErrorMessage(error, "공유 파티 삭제 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
