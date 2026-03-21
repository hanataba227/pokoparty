/**
 * 스코어링 엔진
 * scoring-utils.js (최적화기)와 동일한 로직을 TypeScript로 구현.
 * optimized-weights.json의 가중치와 1:1 대응하는 6칼럼 서브스코어 계산.
 *
 * 6칼럼:
 * - combatFitness: 스탯 집중도 + 스피드 보너스 + 기술일치 + 카운터 견제
 * - moveCoverage: 위력 가중 타입 커버리지 (power≥50)
 * - acquisition: 비선형 입수시기 (ratio^2.0)
 * - stabPower: 최강 자속기 + 타이밍 + 초반 다양성
 * - evolutionEase: 진화 용이성
 * - abilityBonus: 특성 점수표 기반
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
  getTypeWeaknesses,
  ALL_TYPES,
} from "./type-calc";
import { classifyRole } from "./roles";
import {
  loadPokemonData,
  loadStoryData,
  loadEncounters,
  getMovesForPokemon,
  getAvailablePokemonIds,
} from "./data-loader";
import { getFinalScore } from "./score-utils";
import { classifyAttackType } from "./weight-config";

// ========================================
// 특성 점수 데이터 로드
// ========================================

import fs from "fs";
import path from "path";

interface AbilityScoreEntry {
  name: string;
  name_ko: string;
  category: string;
  score: number;
  description: string;
}

interface AbilityScoresFile {
  abilities: Record<string, AbilityScoreEntry>;
}

let abilityScoresCache: Record<string, AbilityScoreEntry> | null = null;

function loadAbilityScores(): Record<string, AbilityScoreEntry> {
  if (abilityScoresCache) return abilityScoresCache;
  const filePath = path.join(process.cwd(), "data", "scoring", "ability-scores.json");
  if (!fs.existsSync(filePath)) {
    abilityScoresCache = {};
    return abilityScoresCache;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as AbilityScoresFile;
  abilityScoresCache = data.abilities;
  return abilityScoresCache;
}

// ========================================
// 타입 상성 유틸리티 (type-calc.ts 재사용)
// ========================================

/** type-chart.json 기반으로 효과적 여부 판별 */
function isEffective(moveType: PokemonType, targetType: PokemonType, typeChart: TypeChart): boolean {
  return getTypeEffectiveness(moveType, targetType, typeChart) > 1;
}

// ========================================
// 공격형 기술 필터
// ========================================

/** 공격형에 맞는 기술만 필터 */
function getMatchingMoves(pokemon: Pokemon, attackType: AttackType) {
  const moves = getMovesForPokemon(pokemon.id);
  return moves.filter((m) => {
    if (m.power <= 0) return false;
    if (attackType === "physical") return m.category === "물리";
    if (attackType === "special") return m.category === "특수";
    return true; // dual: 물리+특수 모두
  });
}

// ========================================
// 1. 전투적합도 (combatFitness)
// ========================================

export function scoreCombatFitness(
  pokemon: Pokemon,
  typeChart: TypeChart
): number {
  const { atk, spa, spe, hp, def: d, spd } = pokemon.stats;
  const atkType = classifyAttackType(atk, spa);
  const types = pokemon.types;
  const total = hp + atk + d + spa + spd + spe;
  const mainAtk = atkType === "special" ? spa : atkType === "physical" ? atk : Math.max(atk, spa);

  // 주력 스탯 집중도 (스피드 캡: 공격의 1.5배까지만 인정)
  const cappedSpe = Math.min(spe, Math.round(mainAtk * 1.5));
  const focusRatio = (mainAtk + cappedSpe) / total;
  const focusScore = Math.min(100, Math.max(0, (focusRatio - 0.25) / 0.40 * 100));

  // 스피드 보너스 (임계값 80, 최대 20)
  const speedBonus = spe >= 80 ? Math.min(20, (spe - 80) / 4) : 0;

  // BST 보너스: 총 종족값이 높을수록 유리 (300~600 범위 → 0~20)
  const bstBonus = Math.min(20, Math.max(0, (total - 300) / 300 * 20));

  // 공격형 기술 일치
  const matchingMoves = getMatchingMoves(pokemon, atkType);
  const hasStabMatch = matchingMoves.some(
    (m) => types.includes(m.type) && m.power >= 60
  );
  const moveMatchScore = hasStabMatch ? 100 : matchingMoves.length > 0 ? 50 : 0;

  // 카운터 견제력
  const weaknesses = getTypeWeaknesses(types, typeChart);
  let counterScore = 100;
  if (weaknesses.length > 0) {
    let countered = 0;
    for (const w of weaknesses) {
      const canCounter = matchingMoves.some((m) => {
        return m.type === w || isEffective(m.type, w, typeChart);
      });
      if (canCounter) countered++;
    }
    counterScore = (countered / weaknesses.length) * 100;
  }

  return Math.min(100, Math.max(0,
    (focusScore + speedBonus + bstBonus) * 0.35 + moveMatchScore * 0.3 + counterScore * 0.35
  ));
}

// ========================================
// 2. 기술폭 (moveCoverage) — 위력 가중 커버리지
// ========================================

export function scoreMoveCoverage(pokemon: Pokemon, typeChart: TypeChart): number {
  const style = classifyAttackType(pokemon.stats.atk, pokemon.stats.spa);
  const moves = getMatchingMoves(pokemon, style);
  const filteredMoves = moves.filter((m) => m.power >= 50);

  // 위력 가중 커버리지: 높은 위력 기술로 커버하는 타입에 더 높은 점수
  let weightedCoverage = 0;
  for (const t of ALL_TYPES) {
    let bestPower = 0;
    for (const m of filteredMoves) {
      if (isEffective(m.type, t, typeChart)) {
        bestPower = Math.max(bestPower, m.power);
      }
    }
    if (bestPower > 0) {
      weightedCoverage += Math.min(1, bestPower / 120);
    }
  }
  return (weightedCoverage / ALL_TYPES.length) * 100;
}

// ========================================
// 3. 입수시기 (acquisition) — 비선형 곡선
// ========================================

/** 진화 전 체인을 역추적하여 pre-evo ID 목록 반환 */
function getPreEvoChain(pokemonId: number, allPokemon: Pokemon[]): number[] {
  // 역방향 맵: evolved_id → pre_evo_id
  const preEvoMap = new Map<number, number>();
  for (const p of allPokemon) {
    if (p.evolutions) {
      for (const evo of p.evolutions) {
        preEvoMap.set(evo.to, p.id);
      }
    }
  }
  const chain: number[] = [];
  let cur = pokemonId;
  while (preEvoMap.has(cur)) {
    cur = preEvoMap.get(cur)!;
    chain.push(cur);
  }
  return chain;
}

/** earliestMap 캐시 (진화 상속 포함) */
let earliestMapCache: Map<number, number> | null = null;

function buildEarliestMap(allPokemon: Pokemon[]): Map<number, number> {
  if (earliestMapCache) return earliestMapCache;

  const encounters = loadEncounters();
  const storyData = loadStoryData();

  const storyOrderMap = new Map<string, number>();
  for (const sp of storyData) {
    storyOrderMap.set(sp.id, sp.order);
  }

  // 직접 출현 데이터 → pokemonId → earliest storyOrder
  const earliest = new Map<number, number>();
  for (const enc of encounters) {
    const order = storyOrderMap.get(enc.storyPointId);
    if (order === undefined) continue;
    const prev = earliest.get(enc.pokemonId);
    if (!prev || order < prev) {
      earliest.set(enc.pokemonId, order);
    }
  }

  // 스타터: order=1
  const STARTER_IDS = [810, 811, 812, 813, 814, 815, 816, 817, 818];
  for (const id of STARTER_IDS) {
    if (!earliest.has(id)) earliest.set(id, 1);
  }

  // 진화 체인 상속: 진화체가 직접 출현 데이터 없으면 진화 전 데이터 상속
  for (const p of allPokemon) {
    if (earliest.has(p.id)) continue;
    const chain = getPreEvoChain(p.id, allPokemon);
    for (const preId of chain) {
      const preOrder = earliest.get(preId);
      if (preOrder !== undefined) {
        earliest.set(p.id, preOrder);
        break;
      }
    }
  }

  earliestMapCache = earliest;
  return earliest;
}

const TOTAL_STORY_POINTS = 28; // scoring-utils.js와 동일

export function scoreAcquisition(
  pokemon: Pokemon,
  storyPoint?: StoryPoint
): number {
  const allPokemon = loadPokemonData();
  const earliest = buildEarliestMap(allPokemon);
  const entry = earliest.get(pokemon.id);
  if (!entry) return 0;

  if (storyPoint && entry > storyPoint.order) return 0;

  // scoring-utils.js와 동일한 공식: (totalSP - storyOrder + 1) / totalSP
  const ratio = (TOTAL_STORY_POINTS - entry + 1) / TOTAL_STORY_POINTS;
  return Math.max(0, Math.round(Math.pow(ratio, 2.0) * 100));
}

// ========================================
// 4. 자속화력 (stabPower)
// ========================================

export function scoreStabPower(pokemon: Pokemon, bossLevel = 50): number {
  const style = classifyAttackType(pokemon.stats.atk, pokemon.stats.spa);
  const types = pokemon.types;
  const moves = getMatchingMoves(pokemon, style);
  const stabMoves = moves.filter((m) => types.includes(m.type));

  if (stabMoves.length === 0) return 0;

  const best = stabMoves.reduce((b, m) => (m.power > b.power ? m : b), stabMoves[0]);

  // 위력 점수 (최대 60)
  const powerScore = Math.min(60, Math.max(0, ((best.power - 40) / 110) * 60));

  // 타이밍 점수 (최대 25): 보스 레벨 이전에 배울수록 높음
  const timingScore =
    best.learnLevel <= bossLevel
      ? 25 * (1 - best.learnLevel / bossLevel)
      : 0;

  // 초반 자속기 다양성 보너스 (최대 15)
  const earlyStabs = stabMoves.filter(
    (m) => m.learnLevel <= 30 && m.power >= 50
  );
  const diversityBonus = Math.min(15, earlyStabs.length * 5);

  return Math.min(100, Math.max(0, powerScore + timingScore + diversityBonus));
}

// ========================================
// 5. 진화 용이성 (evolutionEase)
// ========================================

export function scoreEvolutionEase(pokemon: Pokemon, bossLevel = 50): number {
  // 자기 자신이 아직 진화 가능하면 (비최종형) 기존 로직
  if (pokemon.evolutions && pokemon.evolutions.length > 0) {
    const evo = pokemon.evolutions[0];
    if (evo.method === "level" && evo.level) {
      if (evo.level <= bossLevel) {
        return Math.max(30, 70 - (evo.level / bossLevel) * 40);
      }
      return Math.max(5, 30 - ((evo.level - bossLevel) / 20) * 25);
    }
    if (evo.method === "trade") return 15;
    if (evo.method === "item" || evo.item) return 40;
    return 30;
  }

  // 최종형: "이 최종형에 도달하기까지의 난이도" 역추적
  const allPokemon = loadPokemonData();
  const chain = getPreEvoChain(pokemon.id, allPokemon);
  if (chain.length === 0) return 100; // 진화 없는 단일 포켓몬

  // 가장 어려운 진화 단계(bottleneck) 기준 + 단계 수 소폭 패널티
  let worstScore = 100;
  for (const preId of chain) {
    const preEvo = allPokemon.find((p) => p.id === preId);
    if (!preEvo?.evolutions) continue;
    const evo = preEvo.evolutions[0];
    let stepScore = 100;
    if (evo.method === "trade") {
      stepScore = 15;
    } else if (evo.method === "item" || evo.item) {
      stepScore = 40;
    } else if (evo.method === "level" && evo.level) {
      // Lv16→89, Lv36→76, Lv50→67, Lv60→60
      stepScore = Math.max(40, Math.round(100 - evo.level * 0.67));
    } else {
      stepScore = 50;
    }
    worstScore = Math.min(worstScore, stepScore);
  }

  // 다단 진화 소폭 패널티 (2단: -5, 3단: -10)
  const stagePenalty = Math.max(0, (chain.length - 1) * 5);
  return Math.max(5, worstScore - stagePenalty);
}

// ========================================
// 6. 특성 보정 (abilityBonus)
// ========================================

export function scoreAbilityBonus(pokemon: Pokemon): number {
  const abilityScores = loadAbilityScores();
  if (!pokemon.abilities || pokemon.abilities.length === 0) return 0;

  const normals = pokemon.abilities.filter(
    (a: { name: string; name_ko: string; is_hidden: boolean }) => !a.is_hidden
  );
  if (normals.length === 0) return 0;

  const best = Math.max(
    ...normals.map(
      (a: { name: string; name_ko: string; is_hidden: boolean }) =>
        abilityScores[a.name]?.score ?? 0
    )
  );
  return best * 10; // 0~10 → 0~100
}

// ========================================
// 종합 점수 계산
// ========================================

export function getAttackType(pokemon: Pokemon): AttackType {
  return classifyAttackType(pokemon.stats.atk, pokemon.stats.spa);
}

export function calculateTotalScore(
  pokemon: Pokemon,
  _currentParty: Pokemon[],
  storyPoint: StoryPoint | undefined,
  typeChart: TypeChart
): ScoringBreakdown {
  return {
    combatFitness: Math.round(scoreCombatFitness(pokemon, typeChart)),
    moveCoverage: Math.round(scoreMoveCoverage(pokemon, typeChart)),
    acquisition: scoreAcquisition(pokemon, storyPoint),
    stabPower: Math.round(scoreStabPower(pokemon)),
    evolutionEase: Math.round(scoreEvolutionEase(pokemon)),
    abilityBonus: Math.round(scoreAbilityBonus(pokemon)),
  };
}

// ========================================
// 추천 이유 생성
// ========================================

function generateReasons(
  pokemon: Pokemon,
  breakdown: ScoringBreakdown,
  storyPoint?: StoryPoint
): string[] {
  const reasons: string[] = [];

  if (breakdown.combatFitness >= 70) {
    reasons.push("스탯 배분이 효율적이고 공격형에 맞는 기술을 보유합니다");
  }
  if (breakdown.acquisition >= 60) {
    reasons.push("스토리 초반부터 잡을 수 있어 충분히 키울 시간이 있습니다");
  }
  if (breakdown.stabPower >= 70) {
    reasons.push("강력한 자속 기술을 일찍 배웁니다");
  }
  if (breakdown.moveCoverage >= 50) {
    reasons.push("다양한 타입을 효과적으로 견제합니다");
  }
  if (breakdown.evolutionEase >= 80) {
    reasons.push("진화가 쉽거나 이미 최종 진화형입니다");
  }

  if (storyPoint && storyPoint.bossType.length > 0 && breakdown.combatFitness >= 60) {
    reasons.push(
      `${storyPoint.name}의 ${storyPoint.bossType.join("/")} 타입 상대에 유리합니다`
    );
  }

  if (reasons.length === 0) {
    reasons.push("파티 구성에 안정적인 선택입니다");
  }

  return reasons;
}

// ========================================
// 필터 관련 상수
// ========================================

const STARTER_LINES = new Set([
  810, 811, 812,
  813, 814, 815,
  816, 817, 818,
]);

function applyFilters(candidates: Pokemon[], filters?: RecommendFilters): Pokemon[] {
  if (!filters) return candidates;

  return candidates.filter((p) => {
    if (filters.excludeTradeEvolution && p.evolutions) {
      if (p.evolutions.some((evo) => evo.method === "trade")) return false;
    }
    if (filters.excludeItemEvolution && p.evolutions) {
      if (p.evolutions.some((evo) => evo.method === "stone" || evo.method === "item"))
        return false;
    }
    if (filters.includeStarters === false) {
      if (STARTER_LINES.has(p.id)) return false;
    }
    if (filters.finalOnly) {
      if (p.evolutions && p.evolutions.length > 0) return false;
    }
    if (filters.gen8Only) {
      if (p.id < 810 || p.id > 898) return false;
    }
    if (filters.selectedTypes && filters.selectedTypes.length > 0) {
      const typeSet = new Set(filters.selectedTypes);
      if (!p.types.some((t) => typeSet.has(t))) return false;
    }
    return true;
  });
}

// ========================================
// 파티 추천
// ========================================

export function recommendParty(
  storyPoint: StoryPoint | undefined,
  fixedPokemon: Pokemon[],
  typeChart: TypeChart,
  allPokemon: Pokemon[],
  slotsToFill?: number,
  filters?: RecommendFilters
): PartyRecommendation[] {
  const maxSlots = slotsToFill ?? (6 - fixedPokemon.length);
  const fixedIds = new Set(fixedPokemon.map((p) => p.id));

  let candidates: Pokemon[];
  if (storyPoint) {
    const availableIds = getAvailablePokemonIds(storyPoint.order);
    candidates = allPokemon.filter(
      (p) => availableIds.has(p.id) && !fixedIds.has(p.id)
    );
  } else {
    candidates = allPokemon.filter((p) => !fixedIds.has(p.id));
  }

  const effectiveFilters: RecommendFilters = {
    ...filters,
    finalOnly: filters?.finalOnly !== false ? true : false,
  };
  candidates = applyFilters(candidates, effectiveFilters);

  // 각 후보 점수 계산
  const scored: {
    pokemon: Pokemon;
    breakdown: ScoringBreakdown;
    finalScore: number;
  }[] = [];

  for (const candidate of candidates) {
    const breakdown = calculateTotalScore(candidate, fixedPokemon, storyPoint, typeChart);
    const attackType = getAttackType(candidate);
    const finalScore = getFinalScore(breakdown, attackType);
    scored.push({ pokemon: candidate, breakdown, finalScore });
  }

  // 입수 불가 포켓몬 제외
  const validScored = storyPoint
    ? scored
    : scored.filter((s) => s.breakdown.acquisition > 0);

  validScored.sort((a, b) => b.finalScore - a.finalScore);

  // 그리디 슬롯 채우기
  const recommendations: PartyRecommendation[] = [];
  const currentParty = [...fixedPokemon];

  for (let slot = 0; slot < maxSlots && validScored.length > 0; slot++) {
    const reevaluated = validScored
      .filter((s) => !currentParty.some((p) => p.id === s.pokemon.id))
      .map((s) => {
        const breakdown = calculateTotalScore(s.pokemon, currentParty, storyPoint, typeChart);
        const atkType = getAttackType(s.pokemon);
        let finalScore = getFinalScore(breakdown, atkType);

        // 타입 중복 패널티
        const duplicateTypes = s.pokemon.types.filter((t) =>
          currentParty.some((p) => p.types.includes(t))
        );
        if (duplicateTypes.length > 0) {
          finalScore *= 0.9;
        }

        // 공격 커버리지 기여도 0 패널티 (노말 등)
        const hasZeroCoverage = s.pokemon.types.some((pokemonType) => {
          return !ALL_TYPES.some(
            (defType) => getTypeEffectiveness(pokemonType, defType, typeChart) > 1
          );
        });
        if (hasZeroCoverage) {
          finalScore *= 0.85;
        }

        // BST 보정: 종족값 총합 기반 연속 함수 (480 중심)
        // BST 400→0.75, 456→0.92, 480→1.0, 530→1.17, 600→1.20(cap)
        const { hp, atk, def: d, spa, spd, spe } = s.pokemon.stats;
        const bst = hp + atk + d + spa + spd + spe;
        const bstMultiplier = Math.min(1.20, Math.max(0.75, 1.0 + (bst - 480) / 300));
        finalScore *= bstMultiplier;

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
