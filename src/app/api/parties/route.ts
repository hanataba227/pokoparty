/**
 * GET  /api/parties — 본인 저장 파티 목록 조회 (페이지네이션)
 * POST /api/parties — 파티 저장
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { getApiErrorMessage } from "@/lib/api-error";
import { withRateLimit } from "@/lib/rate-limit";
import { loadPokemonData, loadTypeChart, loadAllPokemonNames } from "@/lib/data-loader";
import { analyzeParty } from "@/lib/party-analysis";
import { getGameById } from "@/lib/game-data";
import { GEN_RANGES } from "@/lib/pokemon-gen";

/** 유저당 최대 저장 파티 수 */
const MAX_PARTIES = 30;

/** 포켓몬 ID 상한 (세대 범위에서 동적 산출) */
const MAX_POKEMON_ID = GEN_RANGES[GEN_RANGES.length - 1][1];


export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    // 페이지네이션 파라미터
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)),
    );
    const offset = (page - 1) * limit;

    // 파티 목록 + 전체 개수를 단일 쿼리로 조회 (최신순)
    const { data: parties, count, error: fetchError } = await supabase
      .from("saved_parties")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error("파티 목록 조회 오류:", fetchError);
      return NextResponse.json(
        { error: "파티 목록을 불러오는 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    // TODO: 등급 사전 저장 denormalization 검토 — 현재 매 요청마다 타입 계산 + 등급 산출 반복
    // 데이터 로드 (루프 밖에서 한 번만)
    const allPokemon = loadPokemonData();
    const typeChart = loadTypeChart();
    const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));

    // 전 게임 포켓몬 이름 맵 (파티 목록 이름 표시용)
    const allNames = loadAllPokemonNames();

    // 각 파티에 gradeInfo + pokemon_names 계산
    const partiesWithGrade = (parties ?? []).map((party) => {
      try {
        const pokemonIds: number[] = party.pokemon_ids;
        const pokemonNames = pokemonIds.map((id) => allNames.get(id) ?? `#${id}`);
        const partyPokemon = pokemonIds
          .map((id) => pokemonMap.get(id))
          .filter((p) => p !== undefined);

        if (partyPokemon.length === 0) {
          return { ...party, gradeInfo: null, pokemon_names: pokemonNames };
        }

        const partyTypes = partyPokemon.map((p) => p.types);
        const { gradeInfo } = analyzeParty(partyTypes, typeChart);

        return { ...party, gradeInfo, pokemon_names: pokemonNames };
      } catch {
        return { ...party, gradeInfo: null, pokemon_names: [] };
      }
    });

    return NextResponse.json({
      parties: partiesWithGrade,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("파티 목록 API 오류:", error);
    const message = getApiErrorMessage(error, "파티 목록을 불러오는 중 오류가 발생했습니다.");
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
    const { name, pokemon_ids, story_point_id, game_id } = body as {
      name: unknown;
      pokemon_ids: unknown;
      story_point_id: unknown;
      game_id: unknown;
    };

    // --- 입력 검증 ---

    // name 검증: 문자열, 1~50자, 공백만으로 구성 불가
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

    // pokemon_ids 검증: 정수 배열, 1~6개, 각 1~1025, 중복 불허
    if (!Array.isArray(pokemon_ids)) {
      return NextResponse.json(
        { error: "포켓몬 목록이 올바르지 않습니다." },
        { status: 400 },
      );
    }
    if (pokemon_ids.length < 1 || pokemon_ids.length > 6) {
      return NextResponse.json(
        { error: "포켓몬은 1~6마리여야 합니다." },
        { status: 400 },
      );
    }
    for (const id of pokemon_ids) {
      if (!Number.isInteger(id) || id < 1 || id > MAX_POKEMON_ID) {
        return NextResponse.json(
          { error: "올바르지 않은 포켓몬 ID가 포함되어 있습니다." },
          { status: 400 },
        );
      }
    }
    // 중복 체크
    if (new Set(pokemon_ids).size !== pokemon_ids.length) {
      return NextResponse.json(
        { error: "중복된 포켓몬은 허용되지 않습니다." },
        { status: 400 },
      );
    }

    // game_id 검증 — game-data.ts의 게임 목록과 동기화
    if (typeof game_id !== "string" || !getGameById(game_id)) {
      return NextResponse.json(
        { error: "올바르지 않은 게임 ID입니다." },
        { status: 400 },
      );
    }

    // story_point_id 검증: 문자열 또는 null/undefined
    if (
      story_point_id !== undefined &&
      story_point_id !== null &&
      typeof story_point_id !== "string"
    ) {
      return NextResponse.json(
        { error: "올바르지 않은 스토리 포인트 ID입니다." },
        { status: 400 },
      );
    }

    // --- 유저당 최대 30개 제한 ---
    const { count } = await supabase
      .from("saved_parties")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count !== null && count >= MAX_PARTIES) {
      return NextResponse.json(
        { error: "저장 가능한 최대 파티 수(30개)를 초과했습니다." },
        { status: 409 },
      );
    }

    // --- 저장 ---
    const { data: party, error: insertError } = await supabase
      .from("saved_parties")
      .insert({
        user_id: user.id,
        name: name.trim(),
        pokemon_ids,
        story_point_id: story_point_id ?? null,
        game_id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("파티 저장 오류:", insertError);
      return NextResponse.json(
        { error: "파티 저장 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(party, { status: 201 });
  } catch (error) {
    console.error("파티 저장 API 오류:", error);
    const message = getApiErrorMessage(error, "파티 저장 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
