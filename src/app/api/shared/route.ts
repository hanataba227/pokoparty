/**
 * POST /api/shared — 파티 공유 (스냅샷 생성)
 * GET  /api/shared — 갤러리 목록 (페이지네이션, 최신순)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { getApiErrorMessage } from "@/lib/api-error";
import { withRateLimit } from "@/lib/rate-limit";
import { loadAllPokemonNames } from "@/lib/data-loader";

/** 유저당 최대 공유 파티 수 */
const MAX_SHARED_PARTIES = 10;

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const supabase = await createServerSupabase();

    // 페이지네이션 파라미터
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "12", 10)),
    );
    const offset = (page - 1) * pageSize;

    // 최신순 조회 + 전체 개수
    const { data: sharedParties, count, error: fetchError } = await supabase
      .from("shared_parties")
      .select("*", { count: "exact" })
      .order("shared_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (fetchError) {
      console.error("공유 파티 목록 조회 오류:", fetchError);
      return NextResponse.json(
        { error: "공유 파티 목록을 불러오는 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    // 포켓몬 이름 맵 (갤러리 카드 표시용)
    const allNames = loadAllPokemonNames();
    const partiesWithNames = (sharedParties ?? []).map((party) => {
      const pokemonNames = (party.pokemon_ids as number[]).map(
        (id) => allNames.get(id) ?? `#${id}`,
      );
      return { ...party, pokemon_names: pokemonNames };
    });

    return NextResponse.json({
      parties: partiesWithNames,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("공유 파티 목록 API 오류:", error);
    const message = getApiErrorMessage(error, "공유 파티 목록을 불러오는 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    const body = await request.json();
    const { party_id } = body as { party_id: unknown };

    // --- 입력 검증 ---
    if (typeof party_id !== "string" || party_id.trim().length === 0) {
      return NextResponse.json(
        { error: "공유할 파티 ID를 입력해주세요." },
        { status: 400 },
      );
    }

    // --- 유저당 최대 공유 수 제한 ---
    const { count: sharedCount } = await supabase
      .from("shared_parties")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (sharedCount !== null && sharedCount >= MAX_SHARED_PARTIES) {
      return NextResponse.json(
        { error: `공유 가능한 최대 파티 수(${MAX_SHARED_PARTIES}개)를 초과했습니다.` },
        { status: 409 },
      );
    }

    // --- 같은 파티 중복 공유 방지 ---
    const { data: existingShare } = await supabase
      .from("shared_parties")
      .select("id")
      .eq("source_party_id", party_id)
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (existingShare) {
      return NextResponse.json(
        { error: "이미 공유된 파티입니다." },
        { status: 409 },
      );
    }

    // --- 원본 파티 조회 (본인 소유 확인) ---
    const { data: party, error: partyError } = await supabase
      .from("saved_parties")
      .select("*")
      .eq("id", party_id)
      .eq("user_id", user.id)
      .single();

    if (partyError || !party) {
      return NextResponse.json(
        { error: "파티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // --- 분석 데이터 조회 ---
    const { data: analysis, error: analysisError } = await supabase
      .from("party_analysis")
      .select("*")
      .eq("party_id", party_id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: "파티 분석 데이터가 없습니다. 먼저 파티 상세 페이지를 방문해주세요." },
        { status: 400 },
      );
    }

    // --- 프로필에서 닉네임 조회 ---
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const displayName = profile?.display_name ?? "트레이너";

    // --- 스냅샷 INSERT ---
    const { data: shared, error: insertError } = await supabase
      .from("shared_parties")
      .insert({
        user_id: user.id,
        source_party_id: party.id,
        party_name: party.name,
        pokemon_ids: party.pokemon_ids,
        game_id: party.game_id,
        memo: party.memo ?? "",
        grade: analysis.grade,
        total_score: analysis.total_score,
        offense_score: analysis.offense_score,
        defense_score: analysis.defense_score,
        diversity_score: analysis.diversity_score,
        coverage: analysis.coverage,
        weaknesses: analysis.weaknesses,
        resistances: analysis.resistances,
        display_name: displayName,
      })
      .select()
      .single();

    if (insertError) {
      console.error("파티 공유 오류:", insertError);
      return NextResponse.json(
        { error: "파티 공유 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(shared, { status: 201 });
  } catch (error) {
    console.error("파티 공유 API 오류:", error);
    const message = getApiErrorMessage(error, "파티 공유 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
