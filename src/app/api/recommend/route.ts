/**
 * POST /api/recommend
 * 파티 추천 API
 *
 * Request: { storyPointId: string, fixedPokemon: string[], slotsToFill?: number }
 * Response: { recommendations: PartyRecommendation[], storyPoint: StoryPoint }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  loadPokemonData,
  loadStoryData,
  loadTypeChart,
  getPokemonById,
} from "@/lib/data-loader";
import { recommendParty } from "@/lib/scoring";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyPointId, fixedPokemon, slotsToFill } = body as {
      storyPointId: string;
      fixedPokemon: string[];
      slotsToFill?: number;
    };

    // 유효성 검사
    if (!storyPointId) {
      return NextResponse.json(
        { error: "스토리 포인트 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!Array.isArray(fixedPokemon)) {
      return NextResponse.json(
        { error: "고정 포켓몬 목록이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    // 데이터 로드
    const allPokemon = loadPokemonData();
    const storyData = loadStoryData();
    const typeChart = loadTypeChart();

    // 스토리 포인트 찾기
    const storyPoint = storyData.find((sp) => sp.id === storyPointId);
    if (!storyPoint) {
      return NextResponse.json(
        { error: `스토리 포인트를 찾을 수 없습니다: ${storyPointId}` },
        { status: 404 }
      );
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
      slotsToFill
    );

    return NextResponse.json({
      recommendations,
      storyPoint,
    });
  } catch (error) {
    console.error("추천 API 오류:", error);

    const message =
      error instanceof Error && error.message.includes("데이터 파일을 찾을 수 없습니다")
        ? error.message
        : "추천 계산 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
