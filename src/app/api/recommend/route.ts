/**
 * POST /api/recommend
 * 파티 추천 API
 *
 * Request: { storyPointId: string, fixedPokemon: string[], slotsToFill?: number }
 * Response: { recommendations: PartyRecommendation[], storyPoint: StoryPoint }
 */
import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import type { PokemonType } from "@/types/pokemon";
import {
  loadPokemonData,
  loadStoryData,
  loadTypeChart,
  getPokemonById,
} from "@/lib/data-loader";
import { recommendParty } from "@/lib/scoring";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { allowed, remaining } = checkRateLimit(getRateLimitKey(request));
  if (!allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": String(remaining) } },
    );
  }

  try {
    const body = await request.json();
    const { storyPointId, fixedPokemon, slotsToFill, filters } = body as {
      storyPointId: string;
      fixedPokemon: string[];
      slotsToFill?: number;
      filters?: {
        excludeTradeEvolution?: boolean;
        excludeItemEvolution?: boolean;
        includeStarters?: boolean;
        finalOnly?: boolean;
        gen8Only?: boolean;
        selectedTypes?: string[];
        gameVersion?: 'sword' | 'shield';
      };
    };

    // 유효성 검사
    if (!Array.isArray(fixedPokemon)) {
      return NextResponse.json(
        { error: "고정 포켓몬 목록이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 데이터 로드 (게임 버전별 포켓몬 JSON 분리 지원)
    const allPokemon = loadPokemonData(filters?.gameVersion);
    const storyData = loadStoryData();
    const typeChart = loadTypeChart();

    // 스토리 포인트 찾기 (optional — 없으면 자유 추천)
    let storyPoint;
    if (storyPointId) {
      storyPoint = storyData.find((sp) => sp.id === storyPointId);
      if (!storyPoint) {
        return NextResponse.json(
          { error: `스토리 포인트를 찾을 수 없습니다: ${storyPointId}` },
          { status: 404 }
        );
      }
    }

    // 고정 포켓몬 조회
    const fixed = fixedPokemon
      .map((idStr) => {
        const id = parseInt(idStr, 10);
        return getPokemonById(id);
      })
      .filter((p) => p !== undefined);

    // 추천 계산
    const recommendations = recommendParty(
      storyPoint,
      fixed,
      typeChart,
      allPokemon,
      slotsToFill,
      filters ? {
        ...filters,
        selectedTypes: filters.selectedTypes as PokemonType[] | undefined,
      } : undefined
    );

    return NextResponse.json({
      recommendations,
      storyPoint,
    });
  } catch (error) {
    console.error("추천 API 오류:", error);

    const message = getApiErrorMessage(error, "추천 계산 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
