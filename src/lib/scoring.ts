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
  DetailedReason,
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
  loadTypeChart,
  getPokemonById,
  loadAbilityScores,
  getStarterIdsForGame,
} from "./data-loader";
import { getGameById } from "./game-data";
import { GEN_RANGES } from "./pokemon-gen";
import { getFinalScore } from "./score-utils";
import { classifyAttackType } from "./weight-config";

// ========================================
// 폴백 상수 (#18)
// ========================================

/** 기술 일치가 부분적일 때의 기본 점수 */
const PARTIAL_MOVE_MATCH_SCORE = 50;
/** 특수 진화 조건(친밀도 등)의 기본 점수 */
const DEFAULT_EVOLUTION_STEP_SCORE = 50;

/**
 * 요청 범위 컨텍스트: recommendParty/recommendMultipleParties에서 생성하여
 * 내부 함수에 매개변수로 전달. 모듈 전역 상태를 제거하여 레이스 컨디션 방지.
 */
interface ScoringContext {
  gameVersion?: string;
  earliestMapCache: Map<number, number> | null;
  preEvoMapCache: Map<number, number> | null;
}

function createScoringContext(gameVersion?: string): ScoringContext {
  return { gameVersion, earliestMapCache: null, preEvoMapCache: null };
}

/** 기본 컨텍스트 (export된 개별 함수를 직접 호출할 때 사용) */
const DEFAULT_CTX: ScoringContext = { gameVersion: undefined, earliestMapCache: null, preEvoMapCache: null };

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
function getMatchingMoves(pokemon: Pokemon, attackType: AttackType, ctx: ScoringContext = DEFAULT_CTX) {
  const moves = getMovesForPokemon(pokemon.id, ctx.gameVersion);
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
  typeChart: TypeChart,
  ctx: ScoringContext = DEFAULT_CTX
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
  const matchingMoves = getMatchingMoves(pokemon, atkType, ctx);
  const hasStabMatch = matchingMoves.some(
    (m) => types.includes(m.type) && m.power >= 60
  );
  const moveMatchScore = hasStabMatch ? 100 : matchingMoves.length > 0 ? PARTIAL_MOVE_MATCH_SCORE : 0;

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

export function scoreMoveCoverage(pokemon: Pokemon, typeChart: TypeChart, ctx: ScoringContext = DEFAULT_CTX): number {
  const style = classifyAttackType(pokemon.stats.atk, pokemon.stats.spa);
  const moves = getMatchingMoves(pokemon, style, ctx);
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

function buildPreEvoMap(allPokemon: Pokemon[], ctx: ScoringContext): Map<number, number> {
  if (ctx.preEvoMapCache) return ctx.preEvoMapCache;
  ctx.preEvoMapCache = new Map();
  for (const p of allPokemon) {
    if (p.evolutions) {
      for (const evo of p.evolutions) {
        ctx.preEvoMapCache.set(evo.to, p.id);
      }
    }
  }
  return ctx.preEvoMapCache;
}

/** 진화 전 체인을 역추적하여 pre-evo ID 목록 반환 */
function getPreEvoChain(pokemonId: number, allPokemon: Pokemon[], ctx: ScoringContext = DEFAULT_CTX): number[] {
  const preEvoMap = buildPreEvoMap(allPokemon, ctx);
  const chain: number[] = [];
  let cur = pokemonId;
  while (preEvoMap.has(cur)) {
    cur = preEvoMap.get(cur)!;
    chain.push(cur);
  }
  return chain;
}

function buildEarliestMap(allPokemon: Pokemon[], ctx: ScoringContext): Map<number, number> {
  if (ctx.earliestMapCache) return ctx.earliestMapCache;

  const encounters = loadEncounters(ctx.gameVersion);
  const storyData = loadStoryData(ctx.gameVersion);

  // storyPointId → order 매핑 (story_order가 없는 encounter의 폴백용)
  const storyOrderMap = new Map<string, number>();
  for (const sp of storyData) {
    storyOrderMap.set(sp.id, sp.order);
  }

  // 직접 출현 데이터 → pokemonId → earliest storyOrder
  // encounter의 story_order가 있으면 직접 사용, 없으면 storyPointId 매핑으로 폴백
  const earliest = new Map<number, number>();
  for (const enc of encounters) {
    const order = enc.storyOrder > 0
      ? enc.storyOrder
      : storyOrderMap.get(enc.storyPointId);
    if (order === undefined) continue;
    const prev = earliest.get(enc.pokemonId);
    if (!prev || order < prev) {
      earliest.set(enc.pokemonId, order);
    }
  }

  // 스타터: order=1 (현재 게임 세대의 스타터)
  const gameEntry = ctx.gameVersion ? getGameById(ctx.gameVersion) : null;
  const gameIdForStarters = gameEntry ? `gen${gameEntry.generation}-${ctx.gameVersion}` : undefined;
  const starterIds = getStarterIdsForGame(gameIdForStarters);
  for (const id of starterIds) {
    if (!earliest.has(id)) earliest.set(id, 1);
  }

  // 진화 체인 상속: 진화체가 직접 출현 데이터 없으면 진화 전 데이터 상속
  for (const p of allPokemon) {
    if (earliest.has(p.id)) continue;
    const chain = getPreEvoChain(p.id, allPokemon, ctx);
    for (const preId of chain) {
      const preOrder = earliest.get(preId);
      if (preOrder !== undefined) {
        earliest.set(p.id, preOrder);
        break;
      }
    }
  }

  ctx.earliestMapCache = earliest;
  return earliest;
}

// ========================================
// 캐시 초기화
// ========================================

export function clearScoringCache(): void {
  // DEFAULT_CTX의 캐시를 초기화 (테스트에서 개별 함수 직접 호출 시 사용)
  DEFAULT_CTX.earliestMapCache = null;
  DEFAULT_CTX.preEvoMapCache = null;
}

/** 현재 게임의 총 스토리 포인트 수 (동적) */
function getTotalStoryPoints(gameVersion?: string): number {
  const storyData = loadStoryData(gameVersion);
  // 스토리 데이터가 없으면 0 반환 → scoreAcquisition에서 입수시기 점수 0 처리
  return storyData.length;
}

export function scoreAcquisition(
  pokemon: Pokemon,
  storyPoint?: StoryPoint,
  ctx: ScoringContext = DEFAULT_CTX
): number {
  const gameVersion = ctx.gameVersion;
  const allPokemon = loadPokemonData(gameVersion);
  const earliest = buildEarliestMap(allPokemon, ctx);
  const entry = earliest.get(pokemon.id);
  if (!entry) return 0;

  if (storyPoint && entry > storyPoint.order) return 0;

  // scoring-utils.js와 동일한 공식: (totalSP - storyOrder + 1) / totalSP
  const totalSP = getTotalStoryPoints(gameVersion);
  if (totalSP === 0) return 0;
  const ratio = (totalSP - entry + 1) / totalSP;
  // encounter story_order가 totalSP를 초과하면 음수 ratio가 되므로 0 반환
  if (ratio <= 0) return 0;
  return Math.round(Math.pow(ratio, 2.0) * 100);
}

// ========================================
// 4. 자속화력 (stabPower)
// ========================================

export function scoreStabPower(pokemon: Pokemon, bossLevel = 50, ctx: ScoringContext = DEFAULT_CTX): number {
  const style = classifyAttackType(pokemon.stats.atk, pokemon.stats.spa);
  const types = pokemon.types;
  const moves = getMatchingMoves(pokemon, style, ctx);
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

export function scoreEvolutionEase(pokemon: Pokemon, bossLevel = 50, ctx: ScoringContext = DEFAULT_CTX): number {
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
  const allPokemon = loadPokemonData(ctx.gameVersion);
  const chain = getPreEvoChain(pokemon.id, allPokemon, ctx);
  if (chain.length === 0) return 100; // 진화 없는 단일 포켓몬

  // 가장 어려운 진화 단계(bottleneck) 기준 + 단계 수 소폭 패널티
  let worstScore = 100;
  for (const preId of chain) {
    const preEvo = getPokemonById(preId, ctx.gameVersion);
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
      stepScore = DEFAULT_EVOLUTION_STEP_SCORE;
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

export function calculateTotalScore(
  pokemon: Pokemon,
  _currentParty: Pokemon[],
  storyPoint: StoryPoint | undefined,
  typeChart: TypeChart,
  ctx: ScoringContext = DEFAULT_CTX
): ScoringBreakdown {
  return {
    combatFitness: Math.round(scoreCombatFitness(pokemon, typeChart, ctx)),
    moveCoverage: Math.round(scoreMoveCoverage(pokemon, typeChart, ctx)),
    acquisition: scoreAcquisition(pokemon, storyPoint, ctx),
    stabPower: Math.round(scoreStabPower(pokemon, undefined, ctx)),
    evolutionEase: Math.round(scoreEvolutionEase(pokemon, undefined, ctx)),
    abilityBonus: Math.round(scoreAbilityBonus(pokemon)),
  };
}

// ========================================
// 추천 이유 생성
// ========================================

// ========================================
// 진화 체인 문자열 구성 헬퍼
// ========================================

/** 포켓몬 ID로부터 최종 진화까지의 체인 구성 (이름 → 이름 → ...) */
function buildEvolutionChainString(pokemon: Pokemon, ctx: ScoringContext): { chain: string; finalLevel?: number } {
  const allPokemon = loadPokemonData(ctx.gameVersion);
  const preChain = getPreEvoChain(pokemon.id, allPokemon, ctx);

  // 역추적 체인을 역순으로 (1단계 → 최종)
  const orderedIds = [...preChain.reverse(), pokemon.id];

  // 현재 포켓몬이 아직 진화 가능하면 진화 후까지 추가
  let current: Pokemon | undefined = pokemon;
  let finalLevel: number | undefined;
  while (current?.evolutions && current.evolutions.length > 0) {
    const evo = current.evolutions[0];
    orderedIds.push(evo.to);
    if (evo.method === "level" && evo.level) {
      finalLevel = evo.level;
    }
    current = getPokemonById(evo.to, ctx.gameVersion);
  }

  // pre-evo 체인의 진화 레벨 중 최대값을 최종 진화 레벨로
  if (!finalLevel) {
    for (const preId of preChain) {
      const preEvo = getPokemonById(preId, ctx.gameVersion);
      if (preEvo?.evolutions) {
        for (const evo of preEvo.evolutions) {
          if (evo.method === "level" && evo.level) {
            finalLevel = Math.max(finalLevel ?? 0, evo.level);
          }
        }
      }
    }
  }

  const names = orderedIds
    .map((id) => getPokemonById(id, ctx.gameVersion)?.name ?? `#${id}`)
    .filter((name, idx, arr) => arr.indexOf(name) === idx); // 중복 제거

  return { chain: names.join(" → "), finalLevel };
}

// ========================================
// 추천 이유 생성 (상세)
// ========================================

export function generateDetailedReasons(
  pokemon: Pokemon,
  breakdown: ScoringBreakdown,
  storyPoint?: StoryPoint,
  ctx: ScoringContext = DEFAULT_CTX
): DetailedReason[] {
  const detailedReasons: DetailedReason[] = [];
  const typeChart = loadTypeChart();
  const atkType = classifyAttackType(pokemon.stats.atk, pokemon.stats.spa);
  const moves = getMovesForPokemon(pokemon.id, ctx.gameVersion);
  const attackMoves = moves.filter((m) => m.power > 0);

  // --- 1. 핵심 기술 이유 (category: 'move') ---

  // 가장 강한 STAB 기술 찾기
  const stabMoves = attackMoves.filter((m) => {
    if (atkType === "physical") return m.category === "물리" && pokemon.types.includes(m.type);
    if (atkType === "special") return m.category === "특수" && pokemon.types.includes(m.type);
    return pokemon.types.includes(m.type); // dual
  });

  if (stabMoves.length > 0) {
    const bestStab = stabMoves.reduce((best, m) => m.power > best.power ? m : best, stabMoves[0]);
    detailedReasons.push({
      category: 'move',
      summary: `${bestStab.name} (Lv${bestStab.learnLevel}, 위력 ${bestStab.power}) — 강력한 자속 기술`,
      details: {
        moveName: bestStab.name,
        moveType: bestStab.type,
        movePower: bestStab.power,
        learnLevel: bestStab.learnLevel,
        isStab: true,
      },
    });
  }

  // 커버리지 기술 (STAB이 아니지만 위력 높은 기술, 상위 1개)
  const coverageMoves = attackMoves
    .filter((m) => !pokemon.types.includes(m.type) && m.power >= 60)
    .filter((m) => {
      if (atkType === "physical") return m.category === "물리";
      if (atkType === "special") return m.category === "특수";
      return true;
    })
    .sort((a, b) => b.power - a.power);

  if (coverageMoves.length > 0) {
    const bestCoverage = coverageMoves[0];
    detailedReasons.push({
      category: 'move',
      summary: `${bestCoverage.name} (Lv${bestCoverage.learnLevel}, 위력 ${bestCoverage.power}) — 커버리지 기술`,
      details: {
        moveName: bestCoverage.name,
        moveType: bestCoverage.type,
        movePower: bestCoverage.power,
        learnLevel: bestCoverage.learnLevel,
        isStab: false,
      },
    });
  }

  // --- 2. 진화 이유 (category: 'evolution') ---

  const isFinalForm = !pokemon.evolutions || pokemon.evolutions.length === 0;
  const allPokemon = loadPokemonData(ctx.gameVersion);
  const preChain = getPreEvoChain(pokemon.id, allPokemon, ctx);
  if (isFinalForm && preChain.length > 0) {
    // 최종 진화형이고 진화 체인이 있는 경우
    const { chain, finalLevel } = buildEvolutionChainString(pokemon, ctx);
    const summary = finalLevel
      ? `이미 최종 진화형으로 바로 활약 가능 (${chain})`
      : `이미 최종 진화형으로 바로 활약 가능`;
    detailedReasons.push({
      category: 'evolution',
      summary,
      details: {
        evolutionChain: chain,
        evolutionLevel: finalLevel,
      },
    });
  } else if (isFinalForm && preChain.length === 0) {
    // 진화 없는 단일 포켓몬
    detailedReasons.push({
      category: 'evolution',
      summary: '진화가 없는 포켓몬으로 바로 활약 가능',
    });
  } else if (pokemon.evolutions && pokemon.evolutions.length > 0) {
    // 아직 진화 가능
    const { chain, finalLevel } = buildEvolutionChainString(pokemon, ctx);
    const summary = finalLevel
      ? `Lv${finalLevel}에 최종 진화 (${chain})`
      : `진화 가능 (${chain})`;
    detailedReasons.push({
      category: 'evolution',
      summary,
      details: {
        evolutionChain: chain,
        evolutionLevel: finalLevel,
      },
    });
  }

  // --- 3. 타입 커버리지 이유 (category: 'coverage') ---

  const coveredTypes: PokemonType[] = [];
  const moveTypes = new Set(attackMoves.map((m) => m.type));
  for (const defType of ALL_TYPES) {
    for (const moveType of moveTypes) {
      if (getTypeEffectiveness(moveType, defType, typeChart) > 1) {
        coveredTypes.push(defType);
        break;
      }
    }
  }

  if (coveredTypes.length > 0) {
    detailedReasons.push({
      category: 'coverage',
      summary: `${coveredTypes.join("/")} 타입 상대에 유리`,
      details: {
        coveredTypes,
      },
    });
  }

  // --- 4. 운용 팁 (category: 'tip') ---

  // 스탯 기반 역할 추천
  const roleLabel = atkType === "physical" ? "물리" : atkType === "special" ? "특수" : "물리/특수 혼합";
  const mainStat = atkType === "physical" ? pokemon.stats.atk : atkType === "special" ? pokemon.stats.spa : Math.max(pokemon.stats.atk, pokemon.stats.spa);
  if (mainStat >= 80) {
    detailedReasons.push({
      category: 'tip',
      summary: `${roleLabel} 공격형 — ${roleLabel} 기술 중심으로 운용 추천`,
    });
  }

  // 약점 주의
  const weaknesses = getTypeWeaknesses(pokemon.types, typeChart);
  if (weaknesses.length >= 4) {
    detailedReasons.push({
      category: 'tip',
      summary: `약점이 ${weaknesses.length}개로 많으니 교체 운용 추천 (${weaknesses.slice(0, 4).join("/")}${weaknesses.length > 4 ? " 등" : ""})`,
    });
  }

  // 스토리 포인트 관련 팁
  if (storyPoint && storyPoint.bossType.length > 0 && breakdown.combatFitness >= 60) {
    detailedReasons.push({
      category: 'tip',
      summary: `${storyPoint.name}의 ${storyPoint.bossType.join("/")} 타입 상대에 유리합니다`,
    });
  }

  // 빠른 스피드 팁
  if (pokemon.stats.spe >= 100) {
    detailedReasons.push({
      category: 'tip',
      summary: `스피드 ${pokemon.stats.spe}으로 대부분의 상대보다 빠르게 행동`,
    });
  }

  return detailedReasons;
}

/** 기존 호환용 reasons 생성 (detailedReasons에서 summary 추출) */
function generateReasons(
  pokemon: Pokemon,
  breakdown: ScoringBreakdown,
  storyPoint?: StoryPoint,
  ctx: ScoringContext = DEFAULT_CTX
): { reasons: string[]; detailedReasons: DetailedReason[] } {
  const detailedReasons = generateDetailedReasons(pokemon, breakdown, storyPoint, ctx);

  // detailedReasons에서 summary를 추출하여 기존 reasons 호환
  const reasons = detailedReasons.map((r) => r.summary);

  if (reasons.length === 0) {
    reasons.push("파티 구성에 안정적인 선택입니다");
  }

  return { reasons, detailedReasons };
}

// ========================================
// 필터 관련 상수
// ========================================

function applyFilters(candidates: Pokemon[], filters?: RecommendFilters, ctx: ScoringContext = DEFAULT_CTX): Pokemon[] {
  if (!filters) return candidates;

  // 현재 게임 세대의 스타터 라인
  const gameEntry = ctx.gameVersion ? getGameById(ctx.gameVersion) : null;
  const gameIdForStarters = gameEntry ? `gen${gameEntry.generation}-${ctx.gameVersion}` : undefined;
  const starterLines = new Set(getStarterIdsForGame(gameIdForStarters));

  return candidates.filter((p) => {
    if (filters.excludeTradeEvolution && p.evolutions) {
      if (p.evolutions.some((evo) => evo.method === "trade")) return false;
    }
    if (filters.excludeItemEvolution && p.evolutions) {
      if (p.evolutions.some((evo) => evo.method === "stone" || evo.method === "item"))
        return false;
    }
    if (filters.includeStarters === false) {
      if (starterLines.has(p.id)) return false;
    }
    if (filters.finalOnly) {
      if (p.evolutions && p.evolutions.length > 0) return false;
    }
    if (filters.gen8Only) {
      const [gen8Start, gen8End] = GEN_RANGES[7]; // 8세대 (인덱스 7)
      if (p.id < gen8Start || p.id > gen8End) return false;
    }
    if (filters.selectedTypes && filters.selectedTypes.length > 0) {
      const typeSet = new Set(filters.selectedTypes);
      if (!p.types.some((t) => typeSet.has(t))) return false;
    }
    return true;
  });
}

// ========================================
// 파티 추천 — 서브함수 (#17 리팩토링)
// ========================================

interface ScoredCandidate {
  pokemon: Pokemon;
  breakdown: ScoringBreakdown;
  finalScore: number;
  /** 캐시: getFinalScore(breakdown, atkType) — 파티 무관 기본 점수 */
  baseScore: number;
  /** 캐시: 공격 커버리지 기여도 0 타입 보유 여부 (포켓몬 고유) */
  hasZeroCoverage: boolean;
  /** 캐시: BST 보정 배수 (포켓몬 고유) */
  bstMultiplier: number;
}

/** 후보 포켓몬 필터링: 스토리 시점별 입수 가능 + 고정 파티 제외 */
function filterCandidates(
  storyPoint: StoryPoint | undefined,
  fixedIds: Set<number>,
  allPokemon: Pokemon[],
  filters?: RecommendFilters,
  ctx: ScoringContext = DEFAULT_CTX
): Pokemon[] {
  let candidates: Pokemon[];
  if (storyPoint) {
    const availableIds = getAvailablePokemonIds(storyPoint.order, ctx.gameVersion);
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
  return applyFilters(candidates, effectiveFilters, ctx);
}

/** 후보 포켓몬 초기 점수 계산 + 포켓몬 고유 속성 캐시 */
function scoreInitialCandidates(
  candidates: Pokemon[],
  fixedPokemon: Pokemon[],
  storyPoint: StoryPoint | undefined,
  typeChart: TypeChart,
  ctx: ScoringContext = DEFAULT_CTX
): ScoredCandidate[] {
  const scored: ScoredCandidate[] = [];
  for (const candidate of candidates) {
    const breakdown = calculateTotalScore(candidate, fixedPokemon, storyPoint, typeChart, ctx);
    const attackType = classifyAttackType(candidate.stats.atk, candidate.stats.spa);
    const baseScore = getFinalScore(breakdown, attackType);

    // 포켓몬 고유 속성 사전 계산 (reevaluateCandidates에서 매 슬롯 반복 방지)
    const hasZeroCoverage = candidate.types.some((pokemonType) => {
      return !ALL_TYPES.some(
        (defType) => getTypeEffectiveness(pokemonType, defType, typeChart) > 1
      );
    });

    const { hp, atk, def: d, spa, spd, spe } = candidate.stats;
    const bst = hp + atk + d + spa + spd + spe;
    const bstMultiplier = Math.min(1.20, Math.max(0.75, 1.0 + (bst - 480) / 300));

    scored.push({
      pokemon: candidate,
      breakdown,
      finalScore: baseScore,
      baseScore,
      hasZeroCoverage,
      bstMultiplier,
    });
  }
  return scored;
}

/** 슬롯 채우기 시 후보 재평가: 타입 중복/커버리지/BST 패널티 적용
 *
 * 성능 최적화: calculateTotalScore()의 6칼럼 서브스코어는 파티 구성과 무관하므로
 * 초기 계산(scoreInitialCandidates)에서 캐시된 breakdown을 재사용한다.
 * 파티 컨텍스트에 따라 달라지는 패널티/보너스만 재계산하여 ~2,400회 → ~400회로 절감.
 */
function reevaluateCandidates(
  validScored: ScoredCandidate[],
  currentParty: Pokemon[],
  _storyPoint: StoryPoint | undefined,
  typeChart: TypeChart
): ScoredCandidate[] {
  // 현재 파티의 타입을 Set으로 미리 수집 (O(1) lookup)
  const partyTypeSet = new Set<PokemonType>();
  for (const p of currentParty) {
    for (const t of p.types) {
      partyTypeSet.add(t);
    }
  }

  // 현재 파티 멤버 ID를 Set으로 수집 (O(1) lookup)
  const partyIdSet = new Set<number>();
  for (const p of currentParty) {
    partyIdSet.add(p.id);
  }

  return validScored
    .filter((s) => !partyIdSet.has(s.pokemon.id))
    .map((s) => {
      // 캐시된 baseScore 재사용 — calculateTotalScore/getFinalScore 재호출 불필요
      let finalScore = s.baseScore;

      // 타입 중복 패널티 (파티 컨텍스트 의존 — 유일한 재계산 항목)
      const hasDuplicateType = s.pokemon.types.some((t) => partyTypeSet.has(t));
      if (hasDuplicateType) {
        finalScore *= 0.9;
      }

      // 캐시된 zero-coverage 패널티 적용
      if (s.hasZeroCoverage) {
        finalScore *= 0.85;
      }

      // 캐시된 BST 보정 적용
      finalScore *= s.bstMultiplier;

      return { ...s, finalScore };
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
  // 요청 범위 컨텍스트 생성 — 모듈 전역 상태 대신 매개변수로 전달
  const ctx = createScoringContext(filters?.gameVersion);

  const maxSlots = slotsToFill ?? (6 - fixedPokemon.length);
  const fixedIds = new Set(fixedPokemon.map((p) => p.id));

  const candidates = filterCandidates(storyPoint, fixedIds, allPokemon, filters, ctx);
  const scored = scoreInitialCandidates(candidates, fixedPokemon, storyPoint, typeChart, ctx);

  // 입수 불가 포켓몬 제외
  const validScored = storyPoint
    ? scored
    : scored.filter((s) => s.breakdown.acquisition > 0);

  validScored.sort((a, b) => b.finalScore - a.finalScore);

  // 그리디 슬롯 채우기
  const recommendations: PartyRecommendation[] = [];
  const currentParty = [...fixedPokemon];

  for (let slot = 0; slot < maxSlots && validScored.length > 0; slot++) {
    const reevaluated = reevaluateCandidates(validScored, currentParty, storyPoint, typeChart);
    reevaluated.sort((a, b) => b.finalScore - a.finalScore);

    if (reevaluated.length > 0) {
      const best = reevaluated[0];
      const { reasons, detailedReasons } = generateReasons(best.pokemon, best.breakdown, storyPoint, ctx);

      recommendations.push({
        pokemon: best.pokemon,
        score: Math.round(best.finalScore),
        reasons,
        role: classifyRole(best.pokemon),
        breakdown: best.breakdown,
        detailedReasons,
      });

      currentParty.push(best.pokemon);
    }
  }

  return recommendations;
}

// ========================================
// 가중 랜덤 유틸리티
// ========================================

/** 점수 비례 확률로 후보 1명 선택 */
function weightedRandomSelect(candidates: ScoredCandidate[]): ScoredCandidate {
  if (candidates.length === 1) return candidates[0];

  const totalScore = candidates.reduce((sum, c) => sum + Math.max(c.finalScore, 1), 0);
  let roll = Math.random() * totalScore;

  for (const candidate of candidates) {
    roll -= Math.max(candidate.finalScore, 1);
    if (roll <= 0) return candidate;
  }

  return candidates[candidates.length - 1];
}

// ========================================
// 다중 파티 추천 (가중 랜덤)
// ========================================

export function recommendMultipleParties(
  storyPoint: StoryPoint | undefined,
  fixedPokemon: Pokemon[],
  typeChart: TypeChart,
  allPokemon: Pokemon[],
  partyCount = 3,
  slotsToFill?: number,
  filters?: RecommendFilters,
  topN = 5,
): PartyRecommendation[][] {
  // 요청 범위 컨텍스트 생성 — 모듈 전역 상태 대신 매개변수로 전달
  const ctx = createScoringContext(filters?.gameVersion);

  const maxSlots = slotsToFill ?? (6 - fixedPokemon.length);
  const fixedIds = new Set(fixedPokemon.map((p) => p.id));

  const candidates = filterCandidates(storyPoint, fixedIds, allPokemon, filters, ctx);
  const scored = scoreInitialCandidates(candidates, fixedPokemon, storyPoint, typeChart, ctx);

  const validScored = storyPoint
    ? scored
    : scored.filter((s) => s.breakdown.acquisition > 0);

  validScored.sort((a, b) => b.finalScore - a.finalScore);

  // 파티 간 포켓몬 등장 횟수 추적 (최대 2회)
  const usageCount = new Map<number, number>();
  const parties: PartyRecommendation[][] = [];

  for (let partyIdx = 0; partyIdx < partyCount; partyIdx++) {
    const recommendations: PartyRecommendation[] = [];
    const currentParty = [...fixedPokemon];

    for (let slot = 0; slot < maxSlots; slot++) {
      const reevaluated = reevaluateCandidates(validScored, currentParty, storyPoint, typeChart);
      reevaluated.sort((a, b) => b.finalScore - a.finalScore);

      // 상위 topN에서 cross-party 제한 적용
      const topCandidates = reevaluated.slice(0, topN);
      let eligible = topCandidates.filter(
        (c) => (usageCount.get(c.pokemon.id) ?? 0) < 2
      );

      // eligible 부족 시 topN 이후에서 보충
      if (eligible.length === 0) {
        eligible = reevaluated
          .filter((c) => (usageCount.get(c.pokemon.id) ?? 0) < 2)
          .slice(0, topN);
      }

      if (eligible.length === 0) break;

      const selected = weightedRandomSelect(eligible);
      const { reasons, detailedReasons } = generateReasons(
        selected.pokemon,
        selected.breakdown,
        storyPoint,
        ctx
      );

      recommendations.push({
        pokemon: selected.pokemon,
        score: Math.round(selected.finalScore),
        reasons,
        role: classifyRole(selected.pokemon),
        breakdown: selected.breakdown,
        detailedReasons,
      });

      currentParty.push(selected.pokemon);
      usageCount.set(
        selected.pokemon.id,
        (usageCount.get(selected.pokemon.id) ?? 0) + 1
      );
    }

    parties.push(recommendations);
  }

  return parties;
}
