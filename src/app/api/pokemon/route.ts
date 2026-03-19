/**
 * GET /api/pokemon
 * 전체 포켓몬 목록 반환 API
 */
import { NextResponse } from "next/server";
import { loadPokemonData } from "@/lib/data-loader";

export async function GET() {
  try {
    const pokemon = loadPokemonData();
    return NextResponse.json({ pokemon });
  } catch (error) {
    console.error("포켓몬 목록 API 오류:", error);

    const message =
      error instanceof Error && error.message.includes("데이터 파일을 찾을 수 없습니다")
        ? error.message
        : "포켓몬 목록을 불러오는 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
