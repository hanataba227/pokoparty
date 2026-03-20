/**
 * 가중치 설정 (클라이언트/서버 공용)
 * optimized-weights.json의 값을 정적 import로 가져옴.
 * fs를 사용하지 않으므로 브라우저 번들에 포함 가능.
 */
import type { AttackType } from "@/types/pokemon";
import optimizedWeights from "../../data/scoring/optimized-weights.json";

// ========================================
// 가중치 타입 정의
// ========================================

/** 6칼럼 가중치 (optimized-weights.json 형식) */
export interface ScoringWeights {
  combatFitness: number;
  moveCoverage: number;
  acquisition: number;
  stabPower: number;
  evolutionEase: number;
  abilityBonus: number;
}

/** optimized-weights.json 전체 구조 */
export interface OptimizedWeightsFile {
  standard: ScoringWeights;
  dual: ScoringWeights;
}

// ========================================
// 가중치 로드
// ========================================

const weights: OptimizedWeightsFile = {
  standard: optimizedWeights.standard,
  dual: optimizedWeights.dual,
};

/**
 * 공격형에 따른 가중치 반환
 * - physical / special → standard 가중치
 * - dual → dual 가중치
 */
export function getWeightsForAttackType(attackType: AttackType): ScoringWeights {
  if (attackType === "dual") {
    return weights.dual;
  }
  return weights.standard;
}

/**
 * 기본 가중치 반환 (공격형 미지정 시 standard 사용)
 */
export function getDefaultWeights(): ScoringWeights {
  return weights.standard;
}

/**
 * 포켓몬 종족값으로 공격형 판별
 * - 물공형: atk - spa > 10
 * - 특공형: spa - atk > 10
 * - 쌍두형: |atk - spa| <= 10
 */
export function classifyAttackType(atk: number, spa: number): AttackType {
  const diff = atk - spa;
  if (diff > 10) return "physical";
  if (diff < -10) return "special";
  return "dual";
}
