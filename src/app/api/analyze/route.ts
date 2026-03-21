/**
 * POST /api/analyze
 * 파티 분석 API
 *
 * Request: { pokemonIds: string[] }
 * Response: { analysis: AnalysisResult }
 */
import { NextRequest, NextResponse } from "next/server";
import type { AnalysisResult, PokemonType } from "@/types/pokemon";
import { loadPokemonData, loadTypeChart } from "@/lib/data-loader";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  ALL_TYPES,
  calculateOffensiveCoverage,
  getDefensiveMatchups,
} from "@/lib/type-calc";
import { withRateLimit } from "@/lib/rate-limit";

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { pokemonIds } = body as { pokemonIds: unknown };

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

    // 데이터 로드
    const allPokemon = loadPokemonData();
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
    const partyAttackTypes = party.map((p) => p.types); // 기본 공격 타입 = 포켓몬 타입

    // 공격 커버리지
    const coverage = calculateOffensiveCoverage(partyAttackTypes, typeChart);

    // 방어 분석 (파티 전체)
    // 각 멤버의 방어 배율을 한 번만 계산
    const memberMatchups = partyTypes.map((types) => getDefensiveMatchups(types, typeChart));

    // 각 타입에 대한 최적 방어 배율
    const typeMatchups: Partial<Record<PokemonType, number>> = {};
    const weaknesses: PokemonType[] = [];
    const resistances: PokemonType[] = [];

    for (const atkType of ALL_TYPES) {
      let bestDefense = Infinity;
      let weakCount = 0;
      let resistCount = 0;

      for (const matchups of memberMatchups) {
        const mult = matchups[atkType];
        bestDefense = Math.min(bestDefense, mult);
        if (mult > 1) weakCount++;
        if (mult < 1) resistCount++;
      }

      typeMatchups[atkType] = bestDefense;
      if (weakCount > party.length / 2) {
        weaknesses.push(atkType);
      }
      if (resistCount > party.length / 2) {
        resistances.push(atkType);
      }
    }

    // 커버리지 점수 (18타입 중 몇 타입을 효과적으로 공격 가능한지)
    const coverageScore = Math.round((coverage.length / ALL_TYPES.length) * 100);

    const analysis: AnalysisResult = {
      coverage,
      weaknesses,
      resistances,
      coverageScore,
      typeMatchups: typeMatchups as Record<PokemonType, number>,
    };

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("분석 API 오류:", error);

    const message = getApiErrorMessage(error, "파티 분석 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
