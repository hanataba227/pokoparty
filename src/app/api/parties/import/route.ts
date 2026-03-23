/**
 * POST /api/parties/import — 공유 파티를 내 파티로 가져오기
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { getApiErrorMessage } from "@/lib/api-error";
import { withRateLimit } from "@/lib/rate-limit";
import { loadPokemonData, loadTypeChart } from "@/lib/data-loader";
import { analyzeParty } from "@/lib/party-analysis";
import { getGameById } from "@/lib/game-data";

/** 유저당 최대 저장 파티 수 */
const MAX_PARTIES = 30;

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    const body = await request.json();
    const { shared_party_id, game_id } = body as {
      shared_party_id: unknown;
      game_id: unknown;
    };

    // --- 입력 검증 ---

    if (typeof shared_party_id !== "string" || shared_party_id.trim().length === 0) {
      return NextResponse.json(
        { error: "공유 파티 ID가 필요합니다." },
        { status: 400 },
      );
    }

    // game_id 검증
    if (typeof game_id !== "string" || !getGameById(game_id)) {
      return NextResponse.json(
        { error: "게임을 선택해주세요." },
        { status: 400 },
      );
    }

    // --- 공유 파티 조회 ---
    const { data: sharedParty, error: sharedError } = await supabase
      .from("shared_parties")
      .select("*")
      .eq("id", shared_party_id)
      .single();

    if (sharedError || !sharedParty) {
      return NextResponse.json(
        { error: "공유 파티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // --- 중복 저장 방지 (같은 유저가 같은 공유 파티를 이미 저장했는지) ---
    const { data: existing } = await supabase
      .from("saved_parties")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_shared_id", shared_party_id)
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 저장한 파티입니다." },
        { status: 409 },
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
    const partyName = `${sharedParty.party_name} (추천)`;
    const pokemonIds: number[] = sharedParty.pokemon_ids;

    const { data: party, error: insertError } = await supabase
      .from("saved_parties")
      .insert({
        user_id: user.id,
        name: partyName,
        pokemon_ids: pokemonIds,
        game_id,
        source: "recommend",
        source_shared_id: shared_party_id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("파티 가져오기 저장 오류:", insertError);
      return NextResponse.json(
        { error: "파티 저장 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    // --- 분석 결과 계산 및 저장 (선택된 game_id 기준) ---
    let analysis = null;
    try {
      const allPokemon = loadPokemonData();
      const typeChart = loadTypeChart();
      const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));

      const partyPokemon = pokemonIds
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

    // --- save_count 증가 ---
    await supabase
      .from("shared_parties")
      .update({ save_count: (sharedParty.save_count ?? 0) + 1 })
      .eq("id", shared_party_id);

    return NextResponse.json({ party, analysis }, { status: 201 });
  } catch (error) {
    console.error("파티 가져오기 API 오류:", error);
    const message = getApiErrorMessage(error, "파티 가져오기 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
