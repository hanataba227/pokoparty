/**
 * POST /api/analyze
 * 파티 분석 API
 *
 * Request: { pokemonIds: string[] }
 * Response: { analysis: AnalysisResult }
 */
import { NextRequest, NextResponse } from "next/server";
import type { AnalysisResult } from "@/types/pokemon";
import { loadPokemonData, loadTypeChart, isValidGameVersion } from "@/lib/data-loader";
import { getApiErrorMessage } from "@/lib/api-error";
import { withRateLimit } from "@/lib/rate-limit";
import { analyzeParty } from "@/lib/party-analysis";

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { pokemonIds, gameVersion } = body as { pokemonIds: unknown; gameVersion?: unknown };

    // 유효성 검사
    if (!Array.isArray(pokemonIds) || pokemonIds.length === 0) {
      return NextResponse.json(
        { error: "분석할 포켓몬 ID 목록이 필요합니다." },
        { status: 400 }
      );
    }

    if (pokemonIds.length > 6) {
      return NextResponse.json(
        { error: "파티는 최대 6마리까지 가능합니다." },
        { status: 400 }
      );
    }

    // 각 요소가 유효한 문자열이며 숫자로 변환 가능한지 검증
    for (const id of pokemonIds) {
      if (typeof id !== "string") {
        return NextResponse.json(
          { error: "포켓몬 ID는 문자열이어야 합니다." },
          { status: 400 },
        );
      }
      const parsed = Number(id);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        return NextResponse.json(
          { error: `올바르지 않은 포켓몬 ID입니다: ${id}` },
          { status: 400 },
        );
      }
    }

    // gameVersion 검증
    if (gameVersion !== undefined && (typeof gameVersion !== "string" || !isValidGameVersion(gameVersion))) {
      return NextResponse.json(
        { error: "올바르지 않은 게임 버전입니다." },
        { status: 400 },
      );
    }

    // 데이터 로드
    const allPokemon = loadPokemonData(gameVersion as string | undefined);
    const typeChart = loadTypeChart();

    // 포켓몬 조회
    const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));
    const party = (pokemonIds as string[])
      .map((idStr) => pokemonMap.get(parseInt(idStr, 10)))
      .filter((p) => p !== undefined);

    if (party.length === 0) {
      return NextResponse.json(
        { error: "유효한 포켓몬을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 타입 분석
    const partyTypes = party.map((p) => p.types);
    const analysis: AnalysisResult = analyzeParty(partyTypes, typeChart);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("분석 API 오류:", error);

    const message = getApiErrorMessage(error, "파티 분석 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
