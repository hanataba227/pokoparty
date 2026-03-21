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
import { withRateLimit } from "@/lib/rate-limit";

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { storyPointId, fixedPokemon, slotsToFill, filters } = body as {
      storyPointId: unknown;
      fixedPokemon: unknown;
      slotsToFill?: unknown;
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

    // --- 입력 검증 ---

    // storyPointId 검증: 문자열이어야 함 (빈 문자열 허용 — 자유 추천)
    if (storyPointId !== undefined && storyPointId !== null && typeof storyPointId !== "string") {
      return NextResponse.json(
        { error: "스토리 포인트 ID가 올바르지 않습니다." },
        { status: 400 },
      );
    }

    // fixedPokemon 검증: 문자열 배열
    if (!Array.isArray(fixedPokemon)) {
      return NextResponse.json(
        { error: "고정 포켓몬 목록이 올바르지 않습니다." },
        { status: 400 },
      );
    }
    for (const item of fixedPokemon) {
      if (typeof item !== "string") {
        return NextResponse.json(
          { error: "고정 포켓몬 ID는 문자열이어야 합니다." },
          { status: 400 },
        );
      }
    }

    // slotsToFill 검증: 정수, 1~6 범위
    if (slotsToFill !== undefined && slotsToFill !== null) {
      if (typeof slotsToFill !== "number" || !Number.isInteger(slotsToFill) || slotsToFill < 1 || slotsToFill > 6) {
        return NextResponse.json(
          { error: "채울 슬롯 수는 1~6 사이의 정수여야 합니다." },
          { status: 400 },
        );
      }
    }

    // filters 검증
    if (filters !== undefined && filters !== null) {
      if (typeof filters !== "object") {
        return NextResponse.json(
          { error: "필터 옵션이 올바르지 않습니다." },
          { status: 400 },
        );
      }
      if (filters.excludeTradeEvolution !== undefined && typeof filters.excludeTradeEvolution !== "boolean") {
        return NextResponse.json(
          { error: "필터 옵션(excludeTradeEvolution)이 올바르지 않습니다." },
          { status: 400 },
        );
      }
      if (filters.excludeItemEvolution !== undefined && typeof filters.excludeItemEvolution !== "boolean") {
        return NextResponse.json(
          { error: "필터 옵션(excludeItemEvolution)이 올바르지 않습니다." },
          { status: 400 },
        );
      }
      if (filters.includeStarters !== undefined && typeof filters.includeStarters !== "boolean") {
        return NextResponse.json(
          { error: "필터 옵션(includeStarters)이 올바르지 않습니다." },
          { status: 400 },
        );
      }
      if (filters.finalOnly !== undefined && typeof filters.finalOnly !== "boolean") {
        return NextResponse.json(
          { error: "필터 옵션(finalOnly)이 올바르지 않습니다." },
          { status: 400 },
        );
      }
      if (filters.gen8Only !== undefined && typeof filters.gen8Only !== "boolean") {
        return NextResponse.json(
          { error: "필터 옵션(gen8Only)이 올바르지 않습니다." },
          { status: 400 },
        );
      }
      if (filters.selectedTypes !== undefined) {
        if (!Array.isArray(filters.selectedTypes) || filters.selectedTypes.some((t) => typeof t !== "string")) {
          return NextResponse.json(
            { error: "필터 옵션(selectedTypes)이 올바르지 않습니다." },
            { status: 400 },
          );
        }
      }
      if (filters.gameVersion !== undefined && filters.gameVersion !== "sword" && filters.gameVersion !== "shield") {
        return NextResponse.json(
          { error: "필터 옵션(gameVersion)이 올바르지 않습니다." },
          { status: 400 },
        );
      }
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
    const fixed = (fixedPokemon as string[])
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
      slotsToFill as number | undefined,
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
});
