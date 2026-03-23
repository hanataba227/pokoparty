/**
 * POST /api/shared — 파티 공유 (스냅샷 생성)
 * GET  /api/shared — 갤러리 목록 (페이지네이션, 정렬, 필터)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { getApiErrorMessage } from "@/lib/api-error";
import { withRateLimit } from "@/lib/rate-limit";
import { loadAllPokemonNames } from "@/lib/data-loader";

/** 유저당 최대 공유 파티 수 */
const MAX_SHARED_PARTIES = 10;

/** 허용되는 정렬 옵션 */
const SORT_OPTIONS: Record<string, { column: string; ascending: boolean }> = {
  recent: { column: "shared_at", ascending: false },
  likes: { column: "like_count", ascending: false },
  saves: { column: "save_count", ascending: false },
  score: { column: "total_score", ascending: false },
};

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

    // 정렬 파라미터
    const sortKey = searchParams.get("sort") ?? "recent";
    const sortOption = SORT_OPTIONS[sortKey] ?? SORT_OPTIONS.recent;

    // 쿼리 빌드
    let query = supabase
      .from("shared_parties")
      .select("*", { count: "exact" });

    // --- 필터 적용 ---

    // q: 파티명 검색 (ILIKE)
    const q = searchParams.get("q");
    if (q && q.trim().length > 0) {
      query = query.ilike("party_name", `%${q.trim()}%`);
    }

    // pokemon: 포켓몬 ID 포함 필터 (contains)
    const pokemonFilter = searchParams.get("pokemon");
    if (pokemonFilter) {
      const pokemonIds = pokemonFilter
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);
      if (pokemonIds.length > 0) {
        query = query.contains("pokemon_ids", pokemonIds);
      }
    }

    // grade: 등급 필터 (in)
    const gradeFilter = searchParams.get("grade");
    if (gradeFilter) {
      const grades = gradeFilter.split(",").map((s) => s.trim()).filter(Boolean);
      if (grades.length > 0) {
        query = query.in("grade", grades);
      }
    }

    // game: 게임 필터 (eq)
    const gameFilter = searchParams.get("game");
    if (gameFilter && gameFilter.trim().length > 0) {
      query = query.eq("game_id", gameFilter.trim());
    }

    // 정렬 + 페이지네이션
    query = query
      .order(sortOption.column, { ascending: sortOption.ascending })
      .range(offset, offset + pageSize - 1);

    const { data: sharedParties, count, error: fetchError } = await query;

    if (fetchError) {
      console.error("공유 파티 목록 조회 오류:", fetchError);
      return NextResponse.json(
        { error: "공유 파티 목록을 불러오는 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    // 로그인 유저 확인 (선택적 — 실패해도 무시)
    let currentUserId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id ?? null;
    } catch {
      // 비로그인 — 무시
    }

    // 로그인 유저의 좋아요 목록 조회
    let likedSet = new Set<string>();
    if (currentUserId && sharedParties && sharedParties.length > 0) {
      const partyIds = sharedParties.map((p) => p.id);
      const { data: likes } = await supabase
        .from("shared_party_likes")
        .select("shared_party_id")
        .eq("user_id", currentUserId)
        .in("shared_party_id", partyIds);

      if (likes) {
        likedSet = new Set(likes.map((l) => l.shared_party_id));
      }
    }

    // 포켓몬 이름 맵 (갤러리 카드 표시용)
    const allNames = loadAllPokemonNames();
    const partiesWithNames = (sharedParties ?? []).map((party) => {
      const pokemonNames = (party.pokemon_ids as number[]).map(
        (id) => allNames.get(id) ?? `#${id}`,
      );
      return {
        ...party,
        pokemon_names: pokemonNames,
        is_liked: likedSet.has(party.id),
      };
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
