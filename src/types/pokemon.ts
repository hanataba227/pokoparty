// PokoParty TypeScript 타입 정의
// 기반: docs/planning/data-model.md

// ========================================
// 기본 타입
// ========================================

/** 포켓몬 18가지 타입 */
export type PokemonType =
  | "노말"
  | "불꽃"
  | "물"
  | "풀"
  | "전기"
  | "얼음"
  | "격투"
  | "독"
  | "땅"
  | "비행"
  | "에스퍼"
  | "벌레"
  | "바위"
  | "고스트"
  | "드래곤"
  | "악"
  | "강철"
  | "페어리";

/** 기술 분류 */
export type MoveCategory = "물리" | "특수" | "변화";

/** 출현 방법 */
export type EncounterMethod = "야생" | "낚시" | "교환" | "선물";

/** 출현 빈도 */
export type EncounterRarity = "흔함" | "보통" | "드묾";

/** 경험치 그룹 */
export type ExpGroup =
  | "erratic"
  | "fast"
  | "medium-fast"
  | "medium-slow"
  | "slow"
  | "fluctuating";

/** 스토리 포인트 유형 */
export type StoryPointType = "gym" | "rival" | "elite4" | "champion";

/** 포켓몬 역할 */
export type PokemonRole =
  | "물리형"
  | "특공형"
  | "쌍두형"
  | "물리방어"
  | "특수방어"
  | "미분류";

// ========================================
// 종족값 (Base Stats)
// ========================================

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

// ========================================
// 진화 정보
// ========================================

export interface Evolution {
  method: string;
  level?: number;
  item?: string;
  to: number; // 진화 후 포켓몬 ID (전국도감 번호)
}

// ========================================
// Pokemon (포켓몬)
// ========================================

export interface Pokemon {
  /** 전국도감 번호 */
  id: number;
  /** 한국어 이름 */
  name: string;
  /** 타입 (1~2개) */
  types: PokemonType[];
  /** 종족값 6종 */
  stats: BaseStats;
  /** 경험치 그룹 */
  expGroup: ExpGroup;
  /** 자동 분류 역할 */
  role: PokemonRole;
  /** 진화 정보 (없을 수 있음) */
  evolutions?: Evolution[];
  /** 특성 목록 */
  abilities?: { name: string; name_ko: string; is_hidden: boolean }[];
}

// ========================================
// Move (기술)
// ========================================

export interface Move {
  /** 기술 ID */
  id: number;
  /** 한국어 이름 */
  name: string;
  /** 기술 타입 */
  type: PokemonType;
  /** 분류: 물리 / 특수 / 변화 */
  category: MoveCategory;
  /** 위력 (변화기는 0) */
  power: number;
  /** 습득 레벨 */
  learnLevel: number;
  /** 습득 포켓몬 ID (FK → Pokemon) */
  pokemonId: number;
}

// ========================================
// StoryPoint (스토리 지점)
// ========================================

export interface StoryPoint {
  /** 고유 식별자 */
  id: string;
  /** 소속 게임 ID (FK → Game) */
  gameId: string;
  /** 진행 순서 */
  order: number;
  /** 유형: gym / rival / elite4 / champion */
  type: StoryPointType;
  /** 보스 포켓몬 타입 */
  bossType: PokemonType[];
  /** 보스 최고 레벨 */
  bossLevel: number;
  /** 한국어 이름 */
  name: string;
}

// ========================================
// Encounter (출현 정보)
// ========================================

export interface Encounter {
  /** 출현 포켓몬 ID (FK → Pokemon) */
  pokemonId: number;
  /** 출현 지점 ID (FK → StoryPoint) */
  storyPointId: string;
  /** 출현 방법 */
  method: EncounterMethod;
  /** 출현 레벨 범위 [min, max] */
  levelRange: [number, number];
  /** 출현 빈도 */
  rarity: EncounterRarity;
}

// ========================================
// TypeChart (타입 상성표)
// ========================================

/**
 * 타입 상성 매트릭스
 * Record<공격타입, Record<방어타입, 배율>>
 */
export type TypeChart = Record<PokemonType, Record<PokemonType, number>>;

// ========================================
// Gym (체육관 정보 — StoryPoint의 확장)
// ========================================

export interface Gym {
  /** 체육관 ID */
  id: string;
  /** 한국어 이름 */
  name: string;
  /** 체육관 타입 */
  type: PokemonType;
  /** 관장 이름 */
  leader: string;
  /** 관장 포켓몬 목록 (ID와 레벨) */
  pokemon: { id: number; level: number }[];
}

// ========================================
// 추천 필터 옵션
// ========================================

/** 추천 필터 옵션 */
export interface RecommendFilters {
  /** 통신교환 진화 포켓몬 제외 */
  excludeTradeEvolution?: boolean;
  /** 도구/돌 진화 포켓몬 제외 */
  excludeItemEvolution?: boolean;
  /** 스타팅 포켓몬 포함 */
  includeStarters?: boolean;
  /** 최종 진화 포켓몬만 포함 */
  finalOnly?: boolean;
  /** 8세대 포켓몬만 포함 */
  gen8Only?: boolean;
  /** 선택된 타입만 포함 */
  selectedTypes?: PokemonType[];
  /** 게임 버전 */
  gameVersion?: 'sword' | 'shield';
}

// ========================================
// 추천 / 분석 결과 타입
// ========================================

/** 추천 이유 상세 정보 */
export interface DetailedReason {
  /** 이유 카테고리 */
  category: 'move' | 'evolution' | 'coverage' | 'tip';
  /** 한 줄 요약 (기존 reasons 스타일) */
  summary: string;
  /** 상세 데이터 (카테고리별 선택적) */
  details?: {
    moveName?: string;
    moveType?: PokemonType;
    movePower?: number;
    learnLevel?: number;
    isStab?: boolean;
    coveredTypes?: PokemonType[];
    evolutionChain?: string;
    evolutionLevel?: number;
  };
}

/** 파티 추천 결과 */
export interface PartyRecommendation {
  /** 추천 포켓몬 */
  pokemon: Pokemon;
  /** 종합 점수 (0~100) */
  score: number;
  /** 추천 이유 목록 */
  reasons: string[];
  /** 추천 역할 */
  role: PokemonRole;
  /** 스코어링 세부 점수 */
  breakdown: ScoringBreakdown;
  /** 상세 추천 이유 (구체적 기술명, 진화 정보, 커버리지 포함) */
  detailedReasons?: DetailedReason[];
}

/** 파티 등급 */
export type PartyGrade = 'S' | 'A' | 'B' | 'C' | 'D';

/** 등급 세부 점수 (3축) */
export interface GradeBreakdown {
  offense: number;   // 공격 커버리지 점수 (0~100)
  defense: number;   // 방어 밸런스 점수 (0~100)
  diversity: number; // 타입 다양성 점수 (0~100)
}

/** 등급 정보 */
export interface GradeInfo {
  grade: PartyGrade;
  totalScore: number;
  breakdown: GradeBreakdown;
  suggestions: string[];
}

/** 타입 분석 결과 */
export interface AnalysisResult {
  /** 타입 커버리지: 공격 시 효과적인 타입 목록 */
  coverage: PokemonType[];
  /** 약점: 파티가 취약한 타입 목록 */
  weaknesses: PokemonType[];
  /** 내성: 파티가 저항하는 타입 목록 */
  resistances: PokemonType[];
  /** 커버리지 점수 (0~100) */
  coverageScore: number;
  /** 약점/내성 상세 (각 타입에 대한 배율) */
  typeMatchups: Record<PokemonType, number>;
  /** 등급 정보 (optional, 하위호환) */
  gradeInfo?: GradeInfo;
}

/** 스코어링 세부 점수 (optimized-weights.json 칼럼과 1:1 매핑) */
export interface ScoringBreakdown {
  /** 전투적합도: 스탯 집중도 + 스피드 보너스 + 기술일치 + 카운터 견제 */
  combatFitness: number;
  /** 기술폭: 위력 가중 타입 커버리지 (power≥50) */
  moveCoverage: number;
  /** 입수시기: 비선형 곡선 (ratio^2.0) */
  acquisition: number;
  /** 자속화력: 최강 자속기 + 타이밍 + 초반 다양성 */
  stabPower: number;
  /** 진화 용이성 */
  evolutionEase: number;
  /** 특성 보정: ability-scores.json 기반 */
  abilityBonus: number;
}

/** 공격형 분류 */
export type AttackType = "physical" | "special" | "dual";

/** 저장된 파티 (Supabase parties 테이블) */
export interface SavedParty {
  id: string;
  name: string;
  pokemon_ids: number[];
  game_id: string;
  story_point_id: string | null;
  created_at: string;
}
