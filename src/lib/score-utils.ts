/**
 * 클라이언트에서도 안전하게 사용할 수 있는 스코어링 유틸리티.
 * data-loader(fs 의존)를 import하지 않으므로 브라우저 번들에 포함 가능.
 *
 * ScoringBreakdown 필드와 optimized-weights.json 키가 1:1 매핑.
 */
import type { ScoringBreakdown, AttackType } from "@/types/pokemon";
import {
  getWeightsForAttackType,
  getDefaultWeights,
  type ScoringWeights,
} from "./weight-config";

/**
 * 6칼럼 가중치를 ScoringBreakdown 필드에 직접 매핑하여 최종 점수 계산
 */
function computeScore(
  breakdown: ScoringBreakdown,
  w: ScoringWeights
): number {
  return (
    breakdown.combatFitness * w.combatFitness +
    breakdown.moveCoverage * w.moveCoverage +
    breakdown.acquisition * w.acquisition +
    breakdown.stabPower * w.stabPower +
    breakdown.evolutionEase * w.evolutionEase +
    breakdown.abilityBonus * w.abilityBonus
  );
}

/**
 * 서브스코어를 가중 합산하여 최종 점수를 계산한다.
 */
export function getFinalScore(
  breakdown: ScoringBreakdown,
  attackType?: AttackType
): number {
  const w = attackType
    ? getWeightsForAttackType(attackType)
    : getDefaultWeights();
  return computeScore(breakdown, w);
}
