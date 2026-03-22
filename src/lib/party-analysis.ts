/**
 * 파티 분석 공통 모듈
 * coverageScore, weaknesses, resistances, typeMatchups 산출 + calculateGrade 호출
 */
import type {
  AnalysisResult,
  PokemonType,
  TypeChart,
} from "@/types/pokemon";
import {
  ALL_TYPES,
  calculateOffensiveCoverage,
  getDefensiveMatchups,
} from "@/lib/type-calc";
import { calculateGrade } from "@/lib/party-grade";

/**
 * 파티 타입 배열로부터 전체 분석 결과를 산출합니다.
 * @param partyTypes 각 파티 멤버의 타입 배열 (e.g. [["불꽃"], ["물", "비행"]])
 * @param typeChart 타입 상성 매트릭스
 * @returns AnalysisResult 분석 결과
 */
export function analyzeParty(
  partyTypes: PokemonType[][],
  typeChart: TypeChart,
): AnalysisResult {
  const partyAttackTypes = partyTypes; // 기본 공격 타입 = 포켓몬 타입

  // 공격 커버리지
  const coverage = calculateOffensiveCoverage(partyAttackTypes, typeChart);

  // 방어 분석: 각 멤버의 방어 배율
  const memberMatchups = partyTypes.map((types) =>
    getDefensiveMatchups(types, typeChart),
  );

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
    if (weakCount > partyTypes.length / 2) {
      weaknesses.push(atkType);
    }
    if (resistCount > partyTypes.length / 2) {
      resistances.push(atkType);
    }
  }

  // 커버리지 점수 (18타입 중 몇 타입을 효과적으로 공격 가능한지)
  const coverageScore = Math.round((coverage.length / ALL_TYPES.length) * 100);

  // 등급 산출
  const gradeInfo = calculateGrade(
    {
      coverage,
      weaknesses,
      resistances,
      coverageScore,
      typeMatchups: typeMatchups as Record<PokemonType, number>,
    },
    partyTypes,
  );

  return {
    coverage,
    weaknesses,
    resistances,
    coverageScore,
    typeMatchups: typeMatchups as Record<PokemonType, number>,
    gradeInfo,
  };
}
