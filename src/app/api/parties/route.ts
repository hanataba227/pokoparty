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
      Math.max(1, parseInt(searchParams.get("limit") ?? "9", 10)),
    );
    const offset = (page - 1) * limit;

    // 파티 목록 + party_analysis JOIN + 전체 개수를 단일 쿼리로 조회 (최신순)
    const { data: parties, count, error: fetchError } = await supabase
      .from("saved_parties")
      .select("*, party_analysis(*)", { count: "exact" })
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

    // 데이터 로드 (루프 밖에서 한 번만)
    const allPokemon = loadPokemonData();
    const typeChart = loadTypeChart();
    const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));

    // 전 게임 포켓몬 이름 맵 (파티 목록 이름 표시용)
    const allNames = loadAllPokemonNames();

    // 각 파티에 gradeInfo + pokemon_names 계산
    // party_analysis가 있으면 저장된 데이터 사용, 없으면 fallback 계산 (lazy 생성)
    const partiesWithGrade = await Promise.all(
      (parties ?? []).map(async (party) => {
        try {
          const pokemonIds: number[] = party.pokemon_ids;
          const pokemonNames = pokemonIds.map((id) => allNames.get(id) ?? `#${id}`);

          // party_analysis JOIN 결과 (Supabase는 1:1 관계를 배열로 반환할 수 있음)
          const analysisRow = Array.isArray(party.party_analysis)
            ? party.party_analysis[0] ?? null
            : party.party_analysis ?? null;

          if (analysisRow) {
            // 저장된 분석 결과를 gradeInfo 형태로 변환
            const gradeInfo = {
              grade: analysisRow.grade,
              totalScore: analysisRow.total_score,
              breakdown: {
                offense: analysisRow.offense_score,
                defense: analysisRow.defense_score,
                diversity: analysisRow.diversity_score,
              },
              suggestions: analysisRow.suggestions ?? [],
            };
            return { ...party, party_analysis: undefined, gradeInfo, pokemon_names: pokemonNames };
          }

          // fallback: party_analysis 없는 기존 파티 — 계산 후 lazy 저장
          const partyPokemon = pokemonIds
            .map((id) => pokemonMap.get(id))
            .filter((p) => p !== undefined);

          if (partyPokemon.length === 0) {
            return { ...party, party_analysis: undefined, gradeInfo: null, pokemon_names: pokemonNames };
          }

          const partyTypes = partyPokemon.map((p) => p.types);
          const analysisResult = analyzeParty(partyTypes, typeChart);
          const gradeInfo = analysisResult.gradeInfo ?? null;

          // lazy 생성: party_analysis에 INSERT (실패해도 무시)
          if (gradeInfo) {
            await supabase.from("party_analysis").insert({
              party_id: party.id,
              grade: gradeInfo.grade,
              total_score: gradeInfo.totalScore,
              offense_score: gradeInfo.breakdown.offense,
              defense_score: gradeInfo.breakdown.defense,
              diversity_score: gradeInfo.breakdown.diversity,
              coverage: analysisResult.coverage,
              weaknesses: analysisResult.weaknesses,
              resistances: analysisResult.resistances,
              suggestions: gradeInfo.suggestions,
            });
          }

          return { ...party, party_analysis: undefined, gradeInfo, pokemon_names: pokemonNames };
        } catch {
          return { ...party, party_analysis: undefined, gradeInfo: null, pokemon_names: [] };
        }
      }),
    );

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

    // --- 분석 결과 계산 및 저장 ---
    let analysis = null;
    try {
      const allPokemon = loadPokemonData();
      const typeChart = loadTypeChart();
      const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));

      const partyPokemon = (pokemon_ids as number[])
        .map((id: number) => pokemonMap.get(id))
        .filter((p) => p !== undefined);

      if (partyPokemon.length > 0) {
        const partyTypes = partyPokemon.map((p) => p.types);
        const analysisResult = analyzeParty(partyTypes, typeChart);
        const gradeInfo = analysisResult.gradeInfo;

        if (!gradeInfo) throw new Error("gradeInfo not computed");

        const analysisRow = {
          party_id: party.id,
          grade: gradeInfo.grade,
          total_score: gradeInfo.totalScore,
          offense_score: gradeInfo.breakdown.offense,
          defense_score: gradeInfo.breakdown.defense,
          diversity_score: gradeInfo.breakdown.diversity,
          coverage: analysisResult.coverage,
          weaknesses: analysisResult.weaknesses,
          resistances: analysisResult.resistances,
          suggestions: gradeInfo.suggestions,
        };

        await supabase.from("party_analysis").insert(analysisRow);

        analysis = {
          grade: gradeInfo.grade,
          totalScore: gradeInfo.totalScore,
          breakdown: gradeInfo.breakdown,
          coverage: analysisResult.coverage,
          weaknesses: analysisResult.weaknesses,
          resistances: analysisResult.resistances,
          suggestions: gradeInfo.suggestions,
        };
      }
    } catch (analysisError) {
      // 분석 저장 실패해도 파티 저장은 성공으로 처리
      console.error("파티 분석 저장 오류:", analysisError);
    }

    return NextResponse.json({ ...party, analysis }, { status: 201 });
  } catch (error) {
    console.error("파티 저장 API 오류:", error);
    const message = getApiErrorMessage(error, "파티 저장 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
