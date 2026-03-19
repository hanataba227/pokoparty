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
import {
  ALL_TYPES,
  getTypeWeaknesses,
  getTypeResistances,
  getTypeImmunities,
  calculateOffensiveCoverage,
  getDefensiveMatchups,
} from "@/lib/type-calc";
import { classifyRole, calculateRoleBalance } from "@/lib/roles";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pokemonIds } = body as { pokemonIds: string[] };

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

    // 데이터 로드
    const allPokemon = loadPokemonData();
    const typeChart = loadTypeChart();

    // 포켓몬 조회
    const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));
    const party = pokemonIds
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
    // 각 타입에 대한 최적 방어 배율
    const typeMatchups: Partial<Record<PokemonType, number>> = {};
    for (const atkType of ALL_TYPES) {
      let bestDefense = Infinity;
      for (const memberTypes of partyTypes) {
        const matchups = getDefensiveMatchups(memberTypes, typeChart);
        bestDefense = Math.min(bestDefense, matchups[atkType]);
      }
      typeMatchups[atkType] = bestDefense;
    }

    // 약점: 파티 전체가 취약한 타입 (모든 멤버에게 효과적인 타입)
    const weaknesses: PokemonType[] = [];
    const resistances: PokemonType[] = [];
    for (const atkType of ALL_TYPES) {
      // 약점: 파티 중 절반 이상이 약점인 타입
      const weakCount = partyTypes.filter((types) => {
        const matchups = getDefensiveMatchups(types, typeChart);
        return matchups[atkType] > 1;
      }).length;
      const resistCount = partyTypes.filter((types) => {
        const matchups = getDefensiveMatchups(types, typeChart);
        return matchups[atkType] < 1;
      }).length;

      if (weakCount > party.length / 2) {
        weaknesses.push(atkType);
      }
      if (resistCount > party.length / 2) {
        resistances.push(atkType);
      }
    }

    // 커버리지 점수 (18타입 중 몇 타입을 효과적으로 공격 가능한지)
    const coverageScore = Math.round((coverage.length / ALL_TYPES.length) * 100);

    // 밸런스 점수 (역할 밸런스)
    const roles = party.map((p) => classifyRole(p));
    const roleBalance = calculateRoleBalance(roles);
    const balanceScore = roleBalance.score;

    const analysis: AnalysisResult = {
      coverage,
      weaknesses,
      resistances,
      coverageScore,
      balanceScore,
      typeMatchups: typeMatchups as Record<PokemonType, number>,
    };

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("분석 API 오류:", error);

    const message =
      error instanceof Error && error.message.includes("데이터 파일을 찾을 수 없습니다")
        ? error.message
        : "파티 분석 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
