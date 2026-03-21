/**
 * 데이터 로더
 * data/ 디렉토리의 JSON 파일들을 서버사이드에서 로드하고 캐싱
 */
import fs from "fs";
import path from "path";
import type {
  Pokemon,
  PokemonType,
  StoryPoint,
  Encounter,
  Gym,
  TypeChart,
  Move,
  BaseStats,
  ExpGroup,
  StoryPointType,
  EncounterMethod,
  EncounterRarity,
} from "@/types/pokemon";
import { classifyRoleFromStats } from "@/lib/roles";

// ========================================
// 영어 → 한국어 타입 매핑
// ========================================

const TYPE_EN_TO_KO: Record<string, PokemonType> = {
  normal: "노말",
  fighting: "격투",
  flying: "비행",
  poison: "독",
  ground: "땅",
  rock: "바위",
  bug: "벌레",
  ghost: "고스트",
  steel: "강철",
  fire: "불꽃",
  water: "물",
  grass: "풀",
  electric: "전기",
  psychic: "에스퍼",
  ice: "얼음",
  dragon: "드래곤",
  dark: "악",
  fairy: "페어리",
};

// ========================================
// 메모리 캐시
// ========================================

let pokemonCache: Pokemon[] | null = null;
let pokemonCacheVersion: string | null = null;
let pokemonNameEnToIdCache: Map<string, number> | null = null;
let movesCache: Map<number, Move[]> | null = null;
let movesCacheVersion: string | null = null;
let storyPointsCache: StoryPoint[] | null = null;
let encountersCache: Encounter[] | null = null;
let gymsCache: Gym[] | null = null;
let typeChartCache: TypeChart | null = null;

// ========================================
// 유틸리티
// ========================================

function getDataPath(...segments: string[]): string {
  return path.join(process.cwd(), "data", ...segments);
}

function readJsonFile<T>(...segments: string[]): T {
  const filePath = getDataPath(...segments);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `데이터 파일을 찾을 수 없습니다: ${segments.join("/")}. data/ 디렉토리에 JSON 파일이 있는지 확인해주세요.`
    );
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function convertTypeToKo(typeEn: string): PokemonType {
  const ko = TYPE_EN_TO_KO[typeEn.toLowerCase()];
  if (!ko) {
    throw new Error(`알 수 없는 타입: ${typeEn}`);
  }
  return ko;
}

// ========================================
// 게임 버전별 JSON 파일 선택
// ========================================

type GameVersion = "sword" | "shield" | undefined;

/**
 * gameVersion에 따라 적절한 포켓몬 JSON 파일명 반환
 * - sword → gen8-sword-pokemon.json
 * - shield → gen8-shield-pokemon.json
 * - undefined → gen8-swsh-pokemon.json (폴백)
 *
 * 버전별 파일이 없으면 gen8-swsh-pokemon.json로 폴백
 */
function getPokemonJsonFilename(gameVersion?: GameVersion): string {
  if (gameVersion === "sword") {
    const swordPath = getDataPath("pokemon", "gen8-sword-pokemon.json");
    if (fs.existsSync(swordPath)) return "gen8-sword-pokemon.json";
  }
  if (gameVersion === "shield") {
    const shieldPath = getDataPath("pokemon", "gen8-shield-pokemon.json");
    if (fs.existsSync(shieldPath)) return "gen8-shield-pokemon.json";
  }
  return "gen8-swsh-pokemon.json";
}

// ========================================
// 로더 함수
// ========================================

interface RawPokemon {
  id: number;
  name: string;
  name_en: string;
  name_ko: string;
  name_ja: string | null;
  types: string[];
  stats: BaseStats;
  exp_group: string;
  evolutions?: {
    method: string;
    level: number | null;
    item: string | null;
    to_id: number;
  }[];
  moves: {
    id: number;
    name: string;
    type: string;
    category: string;
    power: number;
    learn_level: number;
  }[];
  sprite_url?: string;
  abilities?: { name: string; name_ko: string; is_hidden: boolean }[];
}

interface RawPokemonFile {
  pokemon: RawPokemon[];
}

/**
 * 포켓몬 데이터 로드
 * gameVersion에 따라 적절한 JSON 파일에서 로드하여 Pokemon[] 형태로 변환
 * @param gameVersion - 'sword' | 'shield' | undefined (undefined면 통합 파일)
 */
export function loadPokemonData(gameVersion?: GameVersion): Pokemon[] {
  const filename = getPokemonJsonFilename(gameVersion);
  const cacheKey = filename;

  if (pokemonCache && pokemonCacheVersion === cacheKey) return pokemonCache;

  const raw = readJsonFile<RawPokemonFile>("pokemon", filename);

  // name_en -> id 캐시 구축 (loadEncounters에서 재사용)
  pokemonNameEnToIdCache = new Map();
  for (const p of raw.pokemon) {
    if (p.name_en) pokemonNameEnToIdCache.set(p.name_en.toLowerCase(), p.id);
  }

  pokemonCache = raw.pokemon.map((p) => {
    const types = p.types.map(convertTypeToKo);
    const stats: BaseStats = p.stats;
    const expGroup = p.exp_group as ExpGroup;

    const canEvolve = p.evolutions && p.evolutions.length > 0;

    const pokemon: Pokemon = {
      id: p.id,
      name: p.name_ko || p.name,
      types,
      stats,
      expGroup,
      role: classifyRoleFromStats(stats, !!canEvolve),
    };

    if (canEvolve && p.evolutions) {
      pokemon.evolutions = p.evolutions.map((e) => ({
        method: e.method,
        level: e.level ?? undefined,
        item: e.item ?? undefined,
        to: e.to_id,
      }));
    }

    if (p.abilities && p.abilities.length > 0) {
      pokemon.abilities = p.abilities;
    }

    return pokemon;
  });

  pokemonCacheVersion = cacheKey;
  return pokemonCache;
}

/**
 * 포켓몬별 기술 데이터 로드
 * pokemonId -> Move[] 매핑
 * @param gameVersion - 'sword' | 'shield' | undefined
 */
export function loadMovesData(gameVersion?: GameVersion): Map<number, Move[]> {
  const filename = getPokemonJsonFilename(gameVersion);
  const cacheKey = filename;

  if (movesCache && movesCacheVersion === cacheKey) return movesCache;

  const raw = readJsonFile<RawPokemonFile>("pokemon", filename);

  movesCache = new Map();

  for (const p of raw.pokemon) {
    const moves: Move[] = p.moves.map((m) => ({
      id: m.id,
      name: m.name,
      type: convertTypeToKo(m.type),
      category: m.category as Move["category"],
      power: m.power,
      learnLevel: m.learn_level,
      pokemonId: p.id,
    }));
    movesCache.set(p.id, moves);
  }

  movesCacheVersion = cacheKey;
  return movesCache;
}

/**
 * 특정 포켓몬의 기술 목록
 */
export function getMovesForPokemon(pokemonId: number): Move[] {
  const allMoves = loadMovesData();
  return allMoves.get(pokemonId) || [];
}

// ========================================
// 스토리 데이터
// ========================================

interface RawStoryPoint {
  order: number;
  location_id: string;
  location_name: string;
  location_name_en: string;
  section: string;
  type: string;
}

interface RawStoryFile {
  story_points: RawStoryPoint[];
}

interface RawGymEntry {
  order: number;
  leader: string;
  type: string;
  location: string;
  versions: string[];
  pokemon: {
    name_en: string;
    name_ko?: string;
    level: number;
    dynamax?: boolean;
    gigantamax?: boolean;
  }[];
}

interface RawStoryGymFile {
  gyms: RawGymEntry[];
  elite_four?: {
    member: string;
    type: string;
    pokemon: {
      name_en: string;
      name_ko?: string;
      level: number;
    }[];
  }[];
  champion?: {
    name: string;
    pokemon: {
      name_en: string;
      name_ko?: string;
      level: number;
    }[];
  };
}

/**
 * 스토리 포인트 데이터 로드
 * story-order + gyms 데이터를 합쳐 StoryPoint[] 생성
 */
export function loadStoryData(): StoryPoint[] {
  if (storyPointsCache) return storyPointsCache;

  const storyRaw = readJsonFile<RawStoryFile>("story", "gen8-swsh-story-order.json");
  const gymRaw = readJsonFile<RawStoryGymFile>("story", "gen8-swsh-story.json");

  // 체육관 order -> gym 매핑 (버전별로 여러 개일 수 있음)
  const gymByOrder = new Map<number, RawGymEntry[]>();
  for (const gym of gymRaw.gyms) {
    const existing = gymByOrder.get(gym.order) || [];
    existing.push(gym);
    gymByOrder.set(gym.order, existing);
  }

  // 스토리 포인트에 체육관 정보 매핑
  // 체육관이 있는 section에 대해 gym/rival/elite4/champion 구분
  const storyPoints: StoryPoint[] = [];
  const gymSections = new Set<string>();

  for (const sp of storyRaw.story_points) {
    // 체육관 마을(town/city)이고 section에 "체육관"이 포함되면 gym 타입
    const isGymSection = sp.section.includes("체육관");
    const isChampionSection = sp.section.includes("챔피언");

    // 체육관 마을인 경우 체육관 스토리 포인트 생성
    if (isGymSection && (sp.type === "town" || sp.type === "city")) {
      // 해당 체육관 번호 추출
      const gymNumMatch = sp.section.match(/(\d+)번째/);
      if (gymNumMatch) {
        const gymOrder = parseInt(gymNumMatch[1]);
        const gyms = gymByOrder.get(gymOrder);
        if (gyms && gyms.length > 0) {
          // 첫 번째 체육관 (sword 기준) 사용
          const gym = gyms[0];
          const bossLevel = Math.max(...gym.pokemon.map((p) => p.level));
          storyPoints.push({
            id: `gym-${gymOrder}-${sp.location_id}`,
            gameId: "sword-shield",
            order: sp.order,
            type: "gym" as StoryPointType,
            bossType: [convertTypeToKo(gym.type)],
            bossLevel,
            name: `${sp.location_name} 체육관 (${gym.leader})`,
          });
          gymSections.add(sp.section);
          continue;
        }
      }
    }

    // 챔피언컵인 경우
    if (isChampionSection && sp.type === "city") {
      storyPoints.push({
        id: `champion-${sp.location_id}`,
        gameId: "sword-shield",
        order: sp.order,
        type: "champion" as StoryPointType,
        bossType: ["격투" as PokemonType], // 다누리 챔피언 - 혼합
        bossLevel: 65,
        name: `${sp.location_name} 챔피언컵`,
      });
      continue;
    }

    // 일반 스토리 포인트 (route, dungeon, wild_area 등)
    storyPoints.push({
      id: sp.location_id,
      gameId: "sword-shield",
      order: sp.order,
      type: "rival" as StoryPointType, // 일반 지점은 rival로 표시
      bossType: [],
      bossLevel: 0,
      name: sp.location_name,
    });
  }

  storyPointsCache = storyPoints;
  return storyPointsCache;
}

// ========================================
// 출현 정보
// ========================================

interface RawEncounterEntry {
  name_en: string;
  method: string;
  version: string;
  rate?: number;
  level_range: [number, number];
}

interface RawLocation {
  location_id: string;
  location_name: string;
  encounter_count: number;
  encounters: RawEncounterEntry[];
}

interface RawEncounterFile {
  locations: RawLocation[];
}

/**
 * encounter location_id → story-order location_id 매핑 테이블
 * encounter JSON과 story-order JSON의 location_id 형식이 다른 것을 보정
 */
const ENCOUNTER_TO_STORY_LOCATION: Record<string, string> = {
  // 이미 일치하는 town/city
  postwick: "postwick",
  wedgehurst: "wedgehurst",
  turffield: "turffield",
  hulbury: "hulbury",
  motostoke: "motostoke",
  hammerlocke: "hammerlocke",
  "stow-on-side": "stow-on-side",
  ballonlea: "ballonlea",
  circhester: "circhester",
  spikemuth: "spikemuth",
  wyndon: "wyndon",
  // route (routeN → galar-route-N)
  route1: "galar-route-1",
  route2: "galar-route-2",
  route3: "galar-route-3",
  route4: "galar-route-4",
  route5: "galar-route-5",
  route6: "galar-route-6",
  route7: "galar-route-7",
  route8: "galar-route-8",
  route9: "galar-route-9",
  route10: "galar-route-10",
  // dungeon
  slumberingweald: "slumbering-weald",
  galarmine: "galar-mine",
  "galarmineno.2": "galar-mine-2",
  glimwoodtangle: "glimwood-tangle",
  // Wild Area 남부
  rollingfields: "wild-area-south",
  dappledgrove: "wild-area-south",
  westlakeaxewell: "wild-area-south",
  eastlakeaxewell: "wild-area-south",
  "axew'seye": "wild-area-south",
  watchtowerruins: "wild-area-south",
  "giant'sseat": "wild-area-south",
  northlakemiloch: "wild-area-south",
  southlakemiloch: "wild-area-south",
  motostokeriverbank: "wild-area-south",
  bridgefield: "wild-area-south",
  // Wild Area 북부
  stonywilderness: "wild-area-north",
  dustybowl: "wild-area-north",
  "giant'smirror": "wild-area-north",
  "giant'scap": "wild-area-north",
  hammerlockehills: "wild-area-north",
  lakeofoutrage: "wild-area-north",
};

/**
 * encounter name_en 정규화
 * "Mr. Mime" → "mr-mime", "Mime Jr." → "mime-jr", "Farfetch'd" → "farfetchd"
 */
function normalizeEncounterName(nameEn: string): string {
  return nameEn
    .toLowerCase()
    .replace(/[''.]/g, "") // 아포스트로피, 점 제거
    .replace(/\s+/g, "-") // 공백 → 하이픈
    .replace(/-+/g, "-") // 연속 하이픈 정리
    .replace(/-$/, ""); // 끝 하이픈 제거
}

/**
 * 출현 정보 로드
 * encounters JSON에서 로드하여 Encounter[] 형태로 변환
 * 주의: 출현 데이터의 name_en으로는 pokemonId를 직접 매핑할 수 없으므로,
 *       포켓몬 데이터의 name_en과 매칭하여 ID를 찾음
 */
export function loadEncounters(): Encounter[] {
  if (encountersCache) return encountersCache;

  const raw = readJsonFile<RawEncounterFile>("encounter", "gen8-swsh-encounters.json");
  loadPokemonData(); // 캐시 보장

  // loadPokemonData에서 구축된 name_en -> id 캐시 재사용 (중복 파싱 방지)
  const nameToId = pokemonNameEnToIdCache ?? new Map<string, number>();

  const encounters: Encounter[] = [];

  for (const loc of raw.locations) {
    // BUG-1/BUG-3 수정: 매핑 테이블로 encounter location_id → story location_id 변환
    const storyPointId =
      ENCOUNTER_TO_STORY_LOCATION[loc.location_id] || loc.location_id;

    for (const enc of loc.encounters) {
      // BUG-4 수정: name_en 정규화 (Mr. Mime → mr-mime 등)
      const normalizedName = normalizeEncounterName(enc.name_en);
      const pokemonId =
        nameToId.get(normalizedName) || nameToId.get(enc.name_en.toLowerCase());
      if (!pokemonId) continue; // 포켓몬 데이터에 없으면 스킵

      // method 변환
      let method: EncounterMethod = "야생";
      if (enc.method === "fishing" || enc.method === "surf_fishing") {
        method = "낚시";
      } else if (enc.method === "trade") {
        method = "교환";
      } else if (enc.method === "gift" || enc.method === "unknown") {
        method = "선물";
      }

      // rarity 변환 (rate 기반)
      let rarity: EncounterRarity = "보통";
      if (enc.rate !== undefined) {
        if (enc.rate >= 0.3) rarity = "흔함";
        else if (enc.rate >= 0.1) rarity = "보통";
        else rarity = "드묾";
      }

      encounters.push({
        pokemonId,
        storyPointId,
        method,
        levelRange: enc.level_range,
        rarity,
      });
    }
  }

  encountersCache = encounters;
  return encountersCache;
}

// ========================================
// 체육관 데이터
// ========================================

/**
 * 체육관 데이터 로드
 */
export function loadGyms(): Gym[] {
  if (gymsCache) return gymsCache;

  const raw = readJsonFile<RawStoryGymFile>("story", "gen8-swsh-gyms.json");
  const pokemonJsonRaw = readJsonFile<RawPokemonFile>("pokemon", "gen8-swsh-pokemon.json");

  // name_en -> pokemon id 매핑
  const nameToId = new Map<string, number>();
  for (const p of pokemonJsonRaw.pokemon) {
    nameToId.set(p.name_en.toLowerCase(), p.id);
  }

  gymsCache = raw.gyms.map((g) => ({
    id: `gym-${g.order}-${g.location}`,
    name: `${g.leader} 체육관`,
    type: convertTypeToKo(g.type),
    leader: g.leader,
    pokemon: g.pokemon
      .map((p) => ({
        id: nameToId.get(p.name_en.toLowerCase()) || 0,
        level: p.level,
      }))
      .filter((p) => p.id !== 0),
  }));

  return gymsCache;
}

// ========================================
// 타입 상성표
// ========================================

interface RawTypeChartFile {
  types: string[];
  types_ko: Record<string, string>;
  matrix: Record<string, Record<string, number>>;
}

/**
 * 타입 상성 매트릭스 로드
 * 영어 키를 한국어로 변환하여 TypeChart 형태로 반환
 */
export function loadTypeChart(): TypeChart {
  if (typeChartCache) return typeChartCache;

  const raw = readJsonFile<RawTypeChartFile>("battle", "type-chart.json");

  const chart: Partial<Record<PokemonType, Record<PokemonType, number>>> = {};

  for (const [atkEn, defMap] of Object.entries(raw.matrix)) {
    const atkKo = convertTypeToKo(atkEn);
    chart[atkKo] = {} as Record<PokemonType, number>;
    for (const [defEn, multiplier] of Object.entries(defMap)) {
      const defKo = convertTypeToKo(defEn);
      chart[atkKo]![defKo] = multiplier;
    }
  }

  typeChartCache = chart as TypeChart;
  return typeChartCache;
}

// ========================================
// 유틸리티 함수
// ========================================

/**
 * 특정 스토리 포인트까지 잡을 수 있는 포켓몬 ID 목록
 */
export function getAvailablePokemonIds(storyPointOrder: number): Set<number> {
  const encounters = loadEncounters();
  const storyData = loadStoryData();

  // 해당 order 이하의 스토리 포인트 ID 수집
  const availableStoryPointIds = new Set<string>();
  for (const sp of storyData) {
    if (sp.order <= storyPointOrder) {
      availableStoryPointIds.add(sp.id);
    }
  }

  // story-order의 location_id도 추가
  const storyRaw = readJsonFile<RawStoryFile>("story", "gen8-swsh-story-order.json");
  for (const sp of storyRaw.story_points) {
    if (sp.order <= storyPointOrder) {
      availableStoryPointIds.add(sp.location_id);
    }
  }

  const availableIds = new Set<number>();
  for (const enc of encounters) {
    if (availableStoryPointIds.has(enc.storyPointId)) {
      availableIds.add(enc.pokemonId);
    }
  }

  return availableIds;
}

/**
 * 포켓몬 ID로 포켓몬 데이터 조회
 */
export function getPokemonById(id: number): Pokemon | undefined {
  const allPokemon = loadPokemonData();
  return allPokemon.find((p) => p.id === id);
}

/**
 * 캐시 초기화 (테스트용)
 */
export function clearCache(): void {
  pokemonCache = null;
  movesCache = null;
  storyPointsCache = null;
  encountersCache = null;
  gymsCache = null;
  typeChartCache = null;
}
