/**
 * 타입 상성 계산 모듈
 * type-chart.json에서 18x18 타입 상성 매트릭스를 로드하여 계산
 */
import type { PokemonType, TypeChart } from "@/types/pokemon";

/** 18개 타입 목록 */
export const ALL_TYPES: PokemonType[] = [
  "노말", "격투", "비행", "독", "땅", "바위",
  "벌레", "고스트", "강철", "불꽃", "물", "풀",
  "전기", "에스퍼", "얼음", "드래곤", "악", "페어리",
];

/**
 * 공격 타입 → 방어 타입의 배율 반환
 * @returns 0 (무효), 0.5 (반감), 1 (보통), 2 (효과좋음)
 */
export function getTypeEffectiveness(
  attackType: PokemonType,
  defendType: PokemonType,
  typeChart: TypeChart
): number {
  return typeChart[attackType]?.[defendType] ?? 1.0;
}

/**
 * 특정 타입 조합의 약점 타입 목록 반환
 * (배율 > 1인 공격 타입들)
 */
export function getTypeWeaknesses(
  types: PokemonType[],
  typeChart: TypeChart
): PokemonType[] {
  const weaknesses: PokemonType[] = [];

  for (const atkType of ALL_TYPES) {
    let multiplier = 1;
    for (const defType of types) {
      multiplier *= getTypeEffectiveness(atkType, defType, typeChart);
    }
    if (multiplier > 1) {
      weaknesses.push(atkType);
    }
  }

  return weaknesses;
}

/**
 * 특정 타입 조합의 저항 타입 목록 반환
 * (0 < 배율 < 1인 공격 타입들)
 */
export function getTypeResistances(
  types: PokemonType[],
  typeChart: TypeChart
): PokemonType[] {
  const resistances: PokemonType[] = [];

  for (const atkType of ALL_TYPES) {
    let multiplier = 1;
    for (const defType of types) {
      multiplier *= getTypeEffectiveness(atkType, defType, typeChart);
    }
    if (multiplier > 0 && multiplier < 1) {
      resistances.push(atkType);
    }
  }

  return resistances;
}

/**
 * 특정 타입 조합에 대한 각 공격 타입의 배율 계산
 * @returns Record<PokemonType, number> — 각 공격 타입별 배율
 */
export function getDefensiveMatchups(
  types: PokemonType[],
  typeChart: TypeChart
): Record<PokemonType, number> {
  const matchups: Partial<Record<PokemonType, number>> = {};

  for (const atkType of ALL_TYPES) {
    let multiplier = 1;
    for (const defType of types) {
      multiplier *= getTypeEffectiveness(atkType, defType, typeChart);
    }
    matchups[atkType] = multiplier;
  }

  return matchups as Record<PokemonType, number>;
}

/**
 * 파티 전체의 방어 커버리지 계산
 * 각 공격 타입에 대해 파티 중 가장 잘 견디는 배율을 사용
 * @returns Record<PokemonType, number> — 각 타입에 대한 최소 배율
 */
export function calculateDefensiveCoverage(
  partyTypes: PokemonType[][],
  typeChart: TypeChart
): Record<PokemonType, number> {
  const coverage: Partial<Record<PokemonType, number>> = {};

  for (const atkType of ALL_TYPES) {
    let bestDefense = Infinity;

    for (const memberTypes of partyTypes) {
      let multiplier = 1;
      for (const defType of memberTypes) {
        multiplier *= getTypeEffectiveness(atkType, defType, typeChart);
      }
      bestDefense = Math.min(bestDefense, multiplier);
    }

    coverage[atkType] = partyTypes.length > 0 ? bestDefense : 1;
  }

  return coverage as Record<PokemonType, number>;
}

/**
 * 파티 전체의 공격 커버리지 계산
 * 파티의 모든 공격 타입으로 효과적으로 공격 가능한 타입 목록
 * @param partyAttackTypes 파티 멤버들의 공격 가능 타입 목록 (각 멤버별)
 * @returns 효과적으로 공격 가능한 타입 목록 (배율 > 1인 방어 타입)
 */
export function calculateOffensiveCoverage(
  partyAttackTypes: PokemonType[][],
  typeChart: TypeChart
): PokemonType[] {
  const coveredTypes = new Set<PokemonType>();

  // 모든 멤버의 공격 타입을 합침
  const allAttackTypes = new Set<PokemonType>();
  for (const memberTypes of partyAttackTypes) {
    for (const t of memberTypes) {
      allAttackTypes.add(t);
    }
  }

  // 각 방어 타입에 대해 효과적인 공격이 있는지 확인
  for (const defType of ALL_TYPES) {
    for (const atkType of allAttackTypes) {
      const effectiveness = getTypeEffectiveness(atkType, defType, typeChart);
      if (effectiveness > 1) {
        coveredTypes.add(defType);
        break;
      }
    }
  }

  return Array.from(coveredTypes);
}

