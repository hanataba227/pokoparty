/**
 * GET /api/pokemon?gameVersion=sword|shield
 * 전체 포켓몬 목록 반환 API (게임 버전별 필터링 지원)
 */
import { NextRequest, NextResponse } from "next/server";
import { loadPokemonData } from "@/lib/data-loader";
import { getApiErrorMessage } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameVersion = searchParams.get("gameVersion") as "sword" | "shield" | null;
    const pokemon = loadPokemonData(gameVersion ?? undefined);
    return NextResponse.json({ pokemon });
  } catch (error) {
    console.error("포켓몬 목록 API 오류:", error);
    const message = getApiErrorMessage(error, "포켓몬 목록을 불러오는 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
