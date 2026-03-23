import { NextRequest, NextResponse } from "next/server";
import { loadPokemonData, loadTypeChart, isValidGameVersion } from "@/lib/data-loader";
import { getApiErrorMessage } from "@/lib/api-error";
import { withRateLimit } from "@/lib/rate-limit";
import { compareParties } from "@/lib/party-compare";

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { partyA, partyB, gameVersion } = body as { partyA: unknown; partyB: unknown; gameVersion?: unknown };

    for (const [name, ids] of [["partyA", partyA], ["partyB", partyB]] as const) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: `${name}에 포켓몬 ID 목록이 필요합니다.` },
          { status: 400 },
        );
      }
      if (ids.length > 6) {
        return NextResponse.json(
          { error: `${name}는 최대 6마리까지 가능합니다.` },
          { status: 400 },
        );
      }
      for (const id of ids) {
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
    }

    // gameVersion 검증
    if (gameVersion !== undefined && (typeof gameVersion !== "string" || !isValidGameVersion(gameVersion))) {
      return NextResponse.json(
        { error: "올바르지 않은 게임 버전입니다." },
        { status: 400 },
      );
    }

    const allPokemon = loadPokemonData(gameVersion as string | undefined);
    const typeChart = loadTypeChart();
    const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));

    const resolveParty = (ids: string[], name: string) => {
      const pokemon = ids
        .map((idStr) => pokemonMap.get(parseInt(idStr, 10)))
        .filter((p) => p !== undefined);
      if (pokemon.length === 0) {
        return NextResponse.json(
          { error: `${name}에서 유효한 포켓몬을 찾을 수 없습니다.` },
          { status: 404 },
        );
      }
      return pokemon;
    };

    const partyAData = resolveParty(partyA as string[], "partyA");
    if (partyAData instanceof NextResponse) return partyAData;

    const partyBData = resolveParty(partyB as string[], "partyB");
    if (partyBData instanceof NextResponse) return partyBData;

    const result = compareParties(partyAData, partyBData, typeChart);

    return NextResponse.json(result);
  } catch (error) {
    console.error("비교 API 오류:", error);

    const message = getApiErrorMessage(error, "파티 비교 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
