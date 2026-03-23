/**
 * GET /api/pokemon?gameVersion=sword|shield
 * 전체 포켓몬 목록 반환 API (게임 버전별 필터링 지원)
 */
import { NextRequest, NextResponse } from "next/server";
import { loadPokemonData, isValidGameVersion } from "@/lib/data-loader";
import { getApiErrorMessage } from "@/lib/api-error";
import { withRateLimit } from "@/lib/rate-limit";

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameVersion = searchParams.get("gameVersion");
    const fields = searchParams.get("fields");

    if (gameVersion !== null && !isValidGameVersion(gameVersion)) {
      return NextResponse.json(
        { error: "올바르지 않은 게임 버전입니다." },
        { status: 400 },
      );
    }

    const pokemon = loadPokemonData(gameVersion ?? undefined);

    if (fields === "slim") {
      const slimData = pokemon.map(p => ({ id: p.id, name: p.name, types: p.types }));
      return NextResponse.json({ pokemon: slimData });
    }

    return NextResponse.json({ pokemon });
  } catch (error) {
    console.error("포켓몬 목록 API 오류:", error);
    const message = getApiErrorMessage(error, "포켓몬 목록을 불러오는 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
