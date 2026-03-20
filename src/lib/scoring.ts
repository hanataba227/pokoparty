/**
 * 스코어링 엔진
 * optimized-weights.json의 최적화된 가중치를 사용하여 스코어링
 *
 * 6칼럼 가중치 매핑:
 * - combatFitness → typeCoverage (전투적합도)
 * - moveCoverage  → movePool (기술폭)
 * - acquisition   → availability (입수시기)
 * - stabPower     → levelUpSpeed (자속화력)
 * - evolutionEase → evolutionEase (진화용이성)
 * - abilityBonus  → abilityBonus (특성보정)
 */
import type {
  Pokemon,
  PokemonType,
  TypeChart,
  StoryPoint,
  ScoringBreakdown,
  PartyRecommendation,
  RecommendFilters,
  AttackType,
} from "@/types/pokemon";
import {
  getTypeEffectiveness,
  calculateWeaknessChange,
  ALL_TYPES,
} from "./type-calc";
import { classifyRole, calculateRoleBalance } from "./roles";
import {
  loadStoryData,
  loadEncounters,
  getMovesForPokemon,
  getAvailablePokemonIds,
} from "./data-loader";
import { getFinalScore } from "./score-utils";
import { classifyAttackType } from "./weight-config";

// ========================================
// 1. 타입 커버리지 점수
// ========================================

/**
 * 타입 커버리지 점수 계산 (0~100)
 *
 * 평가 항목:
 * - 파티 기존 타입과의 중복 최소화
 * - 공격 커버리지 기여도 (새로운 효과적 공격 타입 추가)
 * - 방어 커버리지 기여도 (약점 감소)
 * - 체육관/보스 타입 커버 보너스
 */
export function calculateTypeCoverageScore(
  pokemon: Pokemon,
  currentParty: Pokemon[],
  typeChart: TypeChart,
  storyPoint?: StoryPoint
): number {
  let score = 50; // 기본 점수

  const partyTypes = currentParty.map((p) => p.types);
  const candidateTypes = pokemon.types;

  // 1) 타입 중복 감점 (-20점 per 중복 타입)
  const existingTypes = new Set<PokemonType>();
  for (const member of currentParty) {
    for (const t of member.types) {
      existingTypes.add(t);
    }
  }
  for (const t of candidateTypes) {
    if (existingTypes.has(t)) {
      score -= 20;
    }
  }

  // 2) 공격 커버리지 기여도
  // 이 포켓몬의 타입으로 효과적으로 공격 가능한 타입 중, 파티가 아직 커버하지 못하는 타입
  const partyAttackTypes = new Set<PokemonType>();
  for (const member of currentParty) {
    for (const atkType of member.types) {
      for (const defType of ALL_TYPES) {
        if (getTypeEffectiveness(atkType, defType, typeChart) > 1) {
          partyAttackTypes.add(defType);
        }
      }
    }
  }

  let newCoverage = 0;
  for (const atkType of candidateTypes) {
    for (const defType of ALL_TYPES) {
      if (getTypeEffectiveness(atkType, defType, typeChart) > 1) {
        if (!partyAttackTypes.has(defType)) {
          newCoverage++;
        }
      }
    }
  }
  score += newCoverage * 5; // 새로 커버하는 타입당 5점

  // 3) 방어 커버리지 기여도
  // 약점 변화량 계산 (음수가 좋음)
  if (currentParty.length > 0) {
    const weaknessChange = calculateWeaknessChange(partyTypes, candidateTypes, typeChart);
    // 약점 감소 시 보너스, 증가 시 감점
    score -= weaknessChange * 3;
  }

  // 4) 내성/무효 보너스
  for (const atkType of ALL_TYPES) {
    let multiplier = 1;
    for (const defType of candidateTypes) {
      multiplier *= getTypeEffectiveness(atkType, defType, typeChart);
    }
    if (multiplier === 0) score += 3; // 무효
    else if (multiplier < 1) score += 1; // 반감
  }

  // 5) 체육관/보스 타입 커버 보너스
  if (storyPoint && storyPoint.bossType.length > 0) {
    for (const atkType of candidateTypes) {
      for (const bossType of storyPoint.bossType) {
        const effectiveness = getTypeEffectiveness(atkType, bossType, typeChart);
        if (effectiveness > 1) {
          score += 15; // 보스 타입에 효과적
        }
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}

// ========================================
// 2. 등장 시점 점수
// ========================================

/**
 * 등장 시점 점수 계산 (0~100)
 *
 * 일찍 합류할수록 높은 점수 (키울 시간이 많으므로)
 */
export function calculateAvailabilityScore(
  pokemon: Pokemon,
  storyPoint: StoryPoint
): number {
  const encounters = loadEncounters();
  const storyData = loadStoryData();

  // 해당 포켓몬의 가장 빠른 출현 시점 찾기
  const pokemonEncounters = encounters.filter((e) => e.pokemonId === pokemon.id);

  if (pokemonEncounters.length === 0) {
    return 0; // 출현 데이터 없음
  }

  // 스토리 포인트 ID -> order 매핑
  const storyOrderMap = new Map<string, number>();
  for (const sp of storyData) {
    storyOrderMap.set(sp.id, sp.order);
  }

  // 가장 빠른 출현 order 찾기
  let earliestOrder = Infinity;
  for (const enc of pokemonEncounters) {
    const order = storyOrderMap.get(enc.storyPointId);
    if (order !== undefined && order <= storyPoint.order) {
      earliestOrder = Math.min(earliestOrder, order);
    }
  }

  if (earliestOrder === Infinity) {
    return 0; // 현재 시점까지 잡을 수 없음
  }

  // 빨리 나올수록 높은 점수
  // order 1(최초) → 100점, storyPoint.order(현재) → 30점
  const totalSteps = Math.max(1, storyPoint.order - 1);
  const stepsFromStart = earliestOrder - 1;
  const ratio = 1 - stepsFromStart / totalSteps;

  return Math.round(30 + ratio * 70);
}

// ========================================
// 3. 레벨업 속도 점수
// ========================================

/**
 * 레벨업 속도 점수 계산 (0~100)
 *
 * 경험치 그룹별 점수:
 * - erratic: 90 (100만 경험치로 레벨 100)
 * - fast: 85 (80만)
 * - medium-fast: 75 (100만)
 * - medium-slow: 60 (106만)
 * - slow: 45 (125만)
 * - fluctuating: 70 (160만이지만 초반 빠름)
 */
export function calculateLevelUpScore(pokemon: Pokemon): number {
  const expGroupScores: Record<string, number> = {
    erratic: 90,
    fast: 85,
    "medium-fast": 75,
    "medium-slow": 60,
    slow: 45,
    fluctuating: 70,
  };

  return expGroupScores[pokemon.expGroup] ?? 50;
}

// ========================================
// 4. 기술 습득 효율 점수
// ========================================

/**
 * 기술 습득 효율 점수 계산 (0~100)
 *
 * 평가 항목:
 * - STAB(자속보정) 기술을 언제 배우는지
 * - 위력 60 이상의 기술을 빨리 배우는지
 * - 체육관 타입에 효과적인 기술을 해당 체육관 전에 배우는지
 */
export function calculateMoveLearnScore(
  pokemon: Pokemon,
  storyPoint: StoryPoint,
  typeChart: TypeChart
): number {
  const moves = getMovesForPokemon(pokemon.id);

  if (moves.length === 0) {
    return 30; // 기술 데이터 없으면 기본 점수
  }

  let score = 40; // 기본 점수

  // 보스 레벨 기준 (해당 시점에서 기대되는 레벨)
  const expectedLevel = storyPoint.bossLevel > 0 ? storyPoint.bossLevel : 30;

  // 1) STAB 기술 평가 (자속 타입의 공격기)
  const stabMoves = moves.filter(
    (m) =>
      pokemon.types.includes(m.type) &&
      m.category !== "변화" &&
      m.power > 0
  );

  if (stabMoves.length > 0) {
    // 가장 빠른 STAB 기술
    const earliestStab = stabMoves.reduce((a, b) =>
      a.learnLevel < b.learnLevel ? a : b
    );
    if (earliestStab.learnLevel <= 10) score += 15;
    else if (earliestStab.learnLevel <= 20) score += 10;
    else if (earliestStab.learnLevel <= expectedLevel) score += 5;

    // 고위력 STAB 기술 (위력 80+)
    const strongStab = stabMoves.filter(
      (m) => m.power >= 80 && m.learnLevel <= expectedLevel
    );
    if (strongStab.length > 0) score += 15;
  }

  // 2) 위력 60+ 기술을 빨리 배우는지
  const strongMoves = moves.filter(
    (m) => m.power >= 60 && m.category !== "변화" && m.learnLevel <= expectedLevel
  );
  if (strongMoves.length >= 3) score += 10;
  else if (strongMoves.length >= 1) score += 5;

  // 3) 체육관 타입에 효과적인 기술
  if (storyPoint.bossType.length > 0) {
    const effectiveMoves = moves.filter((m) => {
      if (m.category === "변화" || m.power === 0) return false;
      if (m.learnLevel > expectedLevel) return false;
      return storyPoint.bossType.some(
        (bt) => getTypeEffectiveness(m.type, bt, typeChart) > 1
      );
    });
    if (effectiveMoves.length > 0) score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

// ========================================
// 5. 진화 용이성 점수
// ========================================

/**
 * 진화 용이성 점수 계산 (0~100)
 *
 * 평가 항목:
 * - 레벨 진화: 진화 레벨이 스토리 내 현실적인지
 * - 통신 진화: 감점 또는 제외
 * - 돌 진화: 해당 진화석 구할 수 있는지
 * - 이미 최종 진화: 높은 점수
 */
export function calculateEvolutionScore(
  pokemon: Pokemon,
  storyPoint: StoryPoint
): number {
  // 진화 정보가 없으면 (최종 진화형이거나 진화가 없는 포켓몬)
  if (!pokemon.evolutions || pokemon.evolutions.length === 0) {
    return 85; // 최종 진화형 또는 무진화 포켓몬은 높은 점수
  }

  let score = 50; // 기본 점수
  const expectedLevel = storyPoint.bossLevel > 0 ? storyPoint.bossLevel : 30;

  for (const evo of pokemon.evolutions) {
    switch (evo.method) {
      case "level":
        // 레벨 진화: 진화 레벨이 현재 기대 레벨 이하면 보너스
        if (evo.level) {
          if (evo.level <= expectedLevel) {
            score += 30; // 스토리 내에서 진화 가능
          } else if (evo.level <= expectedLevel + 10) {
            score += 15; // 조금 더 키우면 진화 가능
          } else {
            score += 5; // 진화까지 먼 편
          }
        }
        break;

      case "trade":
        // 통신 진화: 큰 감점
        score -= 20;
        break;

      case "stone":
      case "item":
        // 돌/아이템 진화: 보통
        score += 15;
        break;

      case "friendship":
      case "happiness":
        // 친밀도 진화: 약간의 보너스 (시간이 걸리지만 가능)
        score += 10;
        break;

      default:
        // 기타 진화 방법
        score += 10;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

// ========================================
// 종합 점수 계산
// ========================================

/**
 * 포켓몬의 공격형 분류
 * - 물공형: atk - spa > 10
 * - 특공형: spa - atk > 10
 * - 쌍두형: |atk - spa| <= 10
 */
export function getAttackType(pokemon: Pokemon): AttackType {
  return classifyAttackType(pokemon.stats.atk, pokemon.stats.spa);
}

/**
 * 종합 추천 점수 계산
 * optimized-weights.json의 6칼럼 가중치를 사용하여 서브스코어 계산
 */
export function calculateTotalScore(
  pokemon: Pokemon,
  currentParty: Pokemon[],
  storyPoint: StoryPoint,
  typeChart: TypeChart
): ScoringBreakdown {
  const typeCoverage = calculateTypeCoverageScore(pokemon, currentParty, typeChart, storyPoint);
  const availability = calculateAvailabilityScore(pokemon, storyPoint);
  const levelUpSpeed = calculateLevelUpScore(pokemon);
  const movePool = calculateMoveLearnScore(pokemon, storyPoint, typeChart);
  const evolutionEase = calculateEvolutionScore(pokemon, storyPoint);
  // abilityBonus: 기본값 50 (향후 특성 데이터 연동 시 구현)
  const abilityBonus = 50;

  return {
    typeCoverage,
    availability,
    levelUpSpeed,
    movePool,
    evolutionEase,
    abilityBonus,
  };
}

// ========================================
// 추천 이유 생성
// ========================================

function generateReasons(
  pokemon: Pokemon,
  breakdown: ScoringBreakdown,
  storyPoint: StoryPoint
): string[] {
  const reasons: string[] = [];

  if (breakdown.typeCoverage >= 70) {
    reasons.push(`${pokemon.types.join("/")} 타입으로 파티의 타입 커버리지를 크게 보완합니다`);
  }
  if (breakdown.availability >= 80) {
    reasons.push("스토리 초반부터 잡을 수 있어 충분히 키울 시간이 있습니다");
  }
  if (breakdown.levelUpSpeed >= 80) {
    reasons.push("경험치 그룹이 빨라 레벨업이 수월합니다");
  }
  if (breakdown.movePool >= 70) {
    reasons.push("유용한 기술을 적절한 타이밍에 배웁니다");
  }
  if (breakdown.evolutionEase >= 80) {
    reasons.push("진화가 쉽거나 이미 최종 진화형입니다");
  }

  // 보스 타입 커버 언급
  if (storyPoint.bossType.length > 0 && breakdown.typeCoverage >= 60) {
    reasons.push(
      `${storyPoint.name}의 ${storyPoint.bossType.join("/")} 타입 상대에 유리합니다`
    );
  }

  // 이유가 없으면 기본 이유
  if (reasons.length === 0) {
    reasons.push("파티 구성에 안정적인 선택입니다");
  }

  return reasons;
}

// ========================================
// 필터 관련 상수
// ========================================

/** 8세대 스타터 포켓몬 라인 (전국도감 번호) */
const STARTER_LINES = new Set([
  810, 811, 812, // 흥나숭 라인
  813, 814, 815, // 염버니 라인
  816, 817, 818, // 울머기 라인
]);

/**
 * 필터 조건에 따라 후보 포켓몬을 필터링
 */
function applyFilters(candidates: Pokemon[], filters?: RecommendFilters): Pokemon[] {
  if (!filters) return candidates;

  return candidates.filter((p) => {
    // 통신교환 진화 제외
    if (filters.excludeTradeEvolution && p.evolutions) {
      const hasTradeEvo = p.evolutions.some((evo) => evo.method === "trade");
      if (hasTradeEvo) return false;
    }

    // 도구/돌 진화 제외
    if (filters.excludeItemEvolution && p.evolutions) {
      const hasItemEvo = p.evolutions.some(
        (evo) => evo.method === "stone" || evo.method === "item"
      );
      if (hasItemEvo) return false;
    }

    // 스타터 포켓몬 제외 (includeStarters가 명시적으로 false일 때만)
    if (filters.includeStarters === false) {
      if (STARTER_LINES.has(p.id)) return false;
    }

    return true;
  });
}

// ========================================
// 파티 추천
// ========================================

/**
 * 파티 추천 메인 함수
 *
 * @param storyPoint 현재 스토리 지점
 * @param fixedPokemon 이미 정해진 파티 멤버 (유저가 선택한 포켓몬)
 * @param typeChart 타입 상성 매트릭스
 * @param allPokemon 전체 포켓몬 데이터
 * @param slotsToFill 채울 슬롯 수 (기본 6 - fixedPokemon 수)
 * @param filters 추천 필터 옵션
 * @returns 추천 결과 배열 (점수순 정렬)
 */
export function recommendParty(
  storyPoint: StoryPoint,
  fixedPokemon: Pokemon[],
  typeChart: TypeChart,
  allPokemon: Pokemon[],
  slotsToFill?: number,
  filters?: RecommendFilters
): PartyRecommendation[] {
  const maxSlots = slotsToFill ?? (6 - fixedPokemon.length);

  // 현재 시점까지 잡을 수 있는 포켓몬 필터링
  const availableIds = getAvailablePokemonIds(storyPoint.order);

  // 고정 멤버 ID 제외
  const fixedIds = new Set(fixedPokemon.map((p) => p.id));

  // 후보 포켓몬 필터링
  let candidates = allPokemon.filter(
    (p) => availableIds.has(p.id) && !fixedIds.has(p.id)
  );

  // 필터 옵션 적용
  candidates = applyFilters(candidates, filters);

  // 각 후보에 대해 점수 계산
  const scored: {
    pokemon: Pokemon;
    breakdown: ScoringBreakdown;
    finalScore: number;
  }[] = [];

  for (const candidate of candidates) {
    const breakdown = calculateTotalScore(
      candidate,
      fixedPokemon,
      storyPoint,
      typeChart
    );
    const attackType = getAttackType(candidate);
    const finalScore = getFinalScore(breakdown, attackType);
    scored.push({ pokemon: candidate, breakdown, finalScore });
  }

  // 점수순 정렬
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // 그리디 방식으로 슬롯 채우기 (밸런스 패널티 적용)
  const recommendations: PartyRecommendation[] = [];
  const currentParty = [...fixedPokemon];

  for (let slot = 0; slot < maxSlots && scored.length > 0; slot++) {
    // 현재 파티 상태에서 각 후보 재평가
    const reevaluated = scored
      .filter((s) => !currentParty.some((p) => p.id === s.pokemon.id))
      .map((s) => {
        const breakdown = calculateTotalScore(
          s.pokemon,
          currentParty,
          storyPoint,
          typeChart
        );
        const atkType = getAttackType(s.pokemon);
        let finalScore = getFinalScore(breakdown, atkType);

        // 밸런스 패널티 적용
        const currentRoles = currentParty.map((p) => classifyRole(p));
        const candidateRole = classifyRole(s.pokemon);
        const testRoles = [...currentRoles, candidateRole];
        const balance = calculateRoleBalance(testRoles);

        // 역할 밸런스가 나쁘면 감점
        if (balance.score < 70) {
          finalScore *= 0.9;
        }
        if (balance.score < 50) {
          finalScore *= 0.85;
        }

        // 타입 중복 패널티
        const duplicateTypes = s.pokemon.types.filter((t) =>
          currentParty.some((p) => p.types.includes(t))
        );
        if (duplicateTypes.length > 0) {
          finalScore *= 0.9;
        }

        return { ...s, breakdown, finalScore };
      });

    reevaluated.sort((a, b) => b.finalScore - a.finalScore);

    if (reevaluated.length > 0) {
      const best = reevaluated[0];
      const reasons = generateReasons(best.pokemon, best.breakdown, storyPoint);

      recommendations.push({
        pokemon: best.pokemon,
        score: Math.round(best.finalScore),
        reasons,
        role: classifyRole(best.pokemon),
        breakdown: best.breakdown,
      });

      currentParty.push(best.pokemon);
    }
  }

  return recommendations;
}
