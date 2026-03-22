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
import { getGameById, getAllGames } from "@/lib/game-data";

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
// 공유 상수
// ========================================

/** 세대별 스타터 포켓몬 진화 라인 ID (1~9세대) */
const STARTER_IDS_BY_GEN: Record<string, number[]> = {
  gen1: [1, 2, 3, 4, 5, 6, 7, 8, 9],           // 이상해씨~리자몽~거북왕
  gen2: [152, 153, 154, 155, 156, 157, 158, 159, 160], // 치코리타~블레이범~장크로다일
  gen3: [252, 253, 254, 255, 256, 257, 258, 259, 260], // 나무지기~번치코~대짱이
  gen4: [387, 388, 389, 390, 391, 392, 393, 394, 395], // 모부기~초염몽~엠페르트
  gen5: [495, 496, 497, 498, 499, 500, 501, 502, 503], // 주리비얀~엠보어~대검귀
  gen6: [650, 651, 652, 653, 654, 655, 656, 657, 658], // 도치마론~마폭시~개굴닌자
  gen7: [722, 723, 724, 725, 726, 727, 728, 729, 730], // 나몰빼미~어흥염~누리레느
  gen8: [810, 811, 812, 813, 814, 815, 816, 817, 818], // 흥나숭~고릴타~인텔리레온
  gen9: [906, 907, 908, 909, 910, 911, 912, 913, 914], // 뉴초모~라우드본~웨니발
};

/** 스타터 포켓몬 진화 라인 ID (기본: 8세대, backward compatible) */
export const STARTER_IDS = STARTER_IDS_BY_GEN.gen8;

/**
 * 게임 ID에 해당하는 세대의 스타터 ID 배열 반환
 * @param gameId - 'gen8-sword' 등의 gameId. 없으면 8세대 기본값.
 */
export function getStarterIdsForGame(gameId?: string): number[] {
  if (!gameId) return STARTER_IDS;
  const genMatch = gameId.match(/^gen(\d+)/);
  if (!genMatch) return STARTER_IDS;
  const genKey = `gen${genMatch[1]}`;
  return STARTER_IDS_BY_GEN[genKey] ?? STARTER_IDS;
}

// ========================================
// 특성 점수 데이터
// ========================================

export interface AbilityScoreEntry {
  name: string;
  name_ko: string;
  category: string;
  score: number;
  description: string;
}

interface AbilityScoresFile {
  abilities: Record<string, AbilityScoreEntry>;
}

// ========================================
// 통합 메모리 캐시 (#11)
// ========================================

/** 모든 데이터 캐시를 단일 Map으로 통합 관리 */
const dataCache = new Map<string, unknown>();

/** 타입 안전 캐시 getter */
function cGet<T>(key: string): T | null {
  return (dataCache.get(key) as T) ?? null;
}

/** 타입 안전 캐시 setter */
function cSet<T>(key: string, value: T): void {
  dataCache.set(key, value);
}

export function loadAbilityScores(): Record<string, AbilityScoreEntry> {
  const cached = cGet<Record<string, AbilityScoreEntry>>("abilityScores");
  if (cached) return cached;
  const filePath = getDataPath("scoring", "ability-scores.json");
  if (!fs.existsSync(filePath)) {
    cSet("abilityScores", {});
    return {};
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as AbilityScoresFile;
  cSet("abilityScores", data.abilities);
  return data.abilities;
}

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
// 게임 ID → 파일명 매핑
// ========================================

/**
 * 게임 ID → 각 데이터 카테고리의 JSON 파일명 매핑
 * 키: GAME_TITLES의 id (예: 'gen8-swsh-sword') 또는 내부 gameVersion
 * 값: { pokemon, story, gyms, encounters } 파일명
 */
interface GameFileMapping {
  pokemon: string;
  story: string;
  gyms: string;
  encounters: string;
}

/**
 * story group → 실제 story/gyms 파일명 접두사 매핑
 * story 파일은 버전쌍 단위로 공유되므로 game ID와 파일명이 다름
 */
const STORY_FILE_PREFIX_MAP: Record<string, { story: string; gyms: string }> = {
  // Gen 1
  'red-green-blue':          { story: 'gen1-rgb-story.json',          gyms: 'gen1-rgb-gyms.json' },
  'yellow':                  { story: 'gen1-yellow-story.json',       gyms: 'gen1-yellow-gyms.json' },
  'firered-leafgreen':       { story: 'gen1-frlg-story.json',        gyms: 'gen1-frlg-gyms.json' },
  'lgp-lge':                 { story: 'gen1-lgpe-story.json',        gyms: 'gen1-lgpe-gyms.json' },
  // Gen 2
  'gold-silver':             { story: 'gen2-gs-story.json',           gyms: 'gen2-gs-gyms.json' },
  'crystal':                 { story: 'gen2-crystal-story.json',      gyms: 'gen2-crystal-gyms.json' },
  'heartgold-soulsilver':    { story: 'gen2-hgss-story.json',        gyms: 'gen2-hgss-gyms.json' },
  // Gen 3
  'ruby-sapphire':           { story: 'gen3-rs-story.json',           gyms: 'gen3-rs-gyms.json' },
  'emerald':                 { story: 'gen3-emerald-story.json',      gyms: 'gen3-emerald-gyms.json' },
  'omegaruby-alphasapphire': { story: 'gen3-oras-story.json',        gyms: 'gen3-oras-gyms.json' },
  // Gen 4
  'diamond-pearl':           { story: 'gen4-dp-story.json',           gyms: 'gen4-dp-gyms.json' },
  'platinum':                { story: 'gen4-platinum-story.json',     gyms: 'gen4-platinum-gyms.json' },
  'brilliantdiamond-shiningpearl': { story: 'gen4-bdsp-story.json',  gyms: 'gen4-bdsp-gyms.json' },
  'legendsarceus':           { story: 'gen4-legendsarceus-story.json', gyms: 'gen4-legendsarceus-bosses.json' },
  // Gen 5
  'black-white':             { story: 'gen5-bw-story.json',           gyms: 'gen5-bw-gyms.json' },
  'black2-white2':           { story: 'gen5-b2w2-story.json',        gyms: 'gen5-b2w2-gyms.json' },
  // Gen 6
  'x-y':                     { story: 'gen6-xy-story.json',           gyms: 'gen6-xy-gyms.json' },
  'legendsza':               { story: 'gen6-legendsza-story.json',   gyms: 'gen6-xy-gyms.json' },
  // Gen 7
  'sun-moon':                { story: 'gen7-sm-story.json',           gyms: 'gen7-sm-trials.json' },
  'ultrasun-ultramoon':      { story: 'gen7-usum-story.json',        gyms: 'gen7-usum-trials.json' },
  // Gen 8
  'sword':                   { story: 'gen8-sword-story.json',        gyms: 'gen8-sword-gyms.json' },
  'shield':                  { story: 'gen8-shield-story.json',       gyms: 'gen8-shield-gyms.json' },
  'sword-shield-ioa':        { story: 'gen8-ioa-story.json',         gyms: 'gen8-sword-gyms.json' },
  'sword-shield-ct':         { story: 'gen8-ct-story.json',          gyms: 'gen8-sword-gyms.json' },
  // Gen 9
  'scarlet-violet':          { story: 'gen9-sv-story.json',           gyms: 'gen9-sv-gyms.json' },
  'scarlet-violet-tm':       { story: 'gen9-tm-story.json',          gyms: 'gen9-sv-gyms.json' },
  'scarlet-violet-id':       { story: 'gen9-id-story.json',          gyms: 'gen9-sv-gyms.json' },
};

/**
 * game-data.ts의 ALL_GAMES에서 동적으로 GAME_FILE_MAP을 생성
 * 게임 ID + generation으로 pokemon/encounter 파일 경로를 자동 생성하고,
 * storyGroup으로 story/gyms 파일을 매핑
 */
function buildGameFileMap(): Record<string, GameFileMapping> {
  const map: Record<string, GameFileMapping> = {};

  for (const game of getAllGames()) {
    const gen = game.generation;
    const id = game.id;

    // pokemon: gen{N}-{id}-pokemon.json
    const pokemon = `gen${gen}-${id}-pokemon.json`;

    // encounters: gen{N}-{id}-encounters.json
    const encounters = `gen${gen}-${id}-encounters.json`;

    // story/gyms: storyGroup 기반 매핑
    const storyFiles = game.storyGroup ? STORY_FILE_PREFIX_MAP[game.storyGroup] : null;
    const story = storyFiles?.story ?? 'gen8-sword-story.json';
    const gyms = storyFiles?.gyms ?? 'gen8-sword-gyms.json';

    map[id] = { pokemon, story, gyms, encounters };
  }

  // 레거시 별명 (하위 호환)
  map["gen8-swsh-sword"] = map["sword"];
  map["gen8-swsh-shield"] = map["shield"];

  return map;
}

/** 게임 ID → 파일 매핑 (ALL_GAMES에서 동적 생성) */
const GAME_FILE_MAP: Record<string, GameFileMapping> = buildGameFileMap();

/** gameVersion/gameId에서 파일 매핑 조회. 없으면 기본값(sword) 반환. */
function getGameFiles(gameId?: string): GameFileMapping {
  if (gameId && GAME_FILE_MAP[gameId]) return GAME_FILE_MAP[gameId];
  return GAME_FILE_MAP["sword"];
}

/** 유효한 게임 버전 문자열 (ALL_GAMES의 모든 게임 ID) */
type GameVersion = string;

/**
 * gameVersion에 따라 적절한 포켓몬 JSON 파일명 반환
 * game-data.ts의 모든 게임 ID를 지원
 * - undefined → gen8-sword-pokemon.json (기본값: sword)
 */
function getPokemonJsonFilename(gameVersion?: GameVersion): string {
  return getGameFiles(gameVersion).pokemon;
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

  const cached = cGet<Pokemon[]>("pokemon");
  if (cached && cGet<string>("pokemonVersion") === filename) return cached;

  const raw = loadRawPokemonFile(gameVersion);

  // name_en -> id 캐시 구축 (loadEncounters에서 재사용)
  const nameEnToId = new Map<string, number>();
  for (const p of raw.pokemon) {
    if (p.name_en) nameEnToId.set(p.name_en.toLowerCase(), p.id);
  }
  cSet("pokemonNameEnToId", nameEnToId);

  const result = raw.pokemon.map((p) => {
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

  cSet("pokemon", result);
  cSet("pokemonVersion", filename);
  return result;
}

function loadRawPokemonFile(gameVersion?: GameVersion): RawPokemonFile {
  const filename = getPokemonJsonFilename(gameVersion);
  const cached = cGet<RawPokemonFile>("rawPokemon");
  if (cached && cGet<string>("rawPokemonVersion") === filename) return cached;
  const result = readJsonFile<RawPokemonFile>("pokemon", filename);
  cSet("rawPokemon", result);
  cSet("rawPokemonVersion", filename);
  return result;
}

/**
 * 포켓몬별 기술 데이터 로드
 * pokemonId -> Move[] 매핑
 * @param gameVersion - 'sword' | 'shield' | undefined
 */
export function loadMovesData(gameVersion?: GameVersion): Map<number, Move[]> {
  const filename = getPokemonJsonFilename(gameVersion);

  const cached = cGet<Map<number, Move[]>>("moves");
  if (cached && cGet<string>("movesVersion") === filename) return cached;

  const raw = loadRawPokemonFile(gameVersion);

  const result = new Map<number, Move[]>();

  for (const p of raw.pokemon) {
    const moves: Move[] = p.moves
      .filter((m) => m.type != null)
      .map((m) => ({
        id: m.id,
        name: m.name,
        type: convertTypeToKo(m.type),
        category: m.category as Move["category"],
        power: m.power,
        learnLevel: m.learn_level,
        pokemonId: p.id,
      }));
    result.set(p.id, moves);
  }

  cSet("moves", result);
  cSet("movesVersion", filename);
  return result;
}

/**
 * 특정 포켓몬의 기술 목록
 */
export function getMovesForPokemon(pokemonId: number, gameVersion?: string): Move[] {
  const allMoves = loadMovesData(gameVersion);
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
  leader_ko?: string;
  type: string;
  location: string;
  badge?: string;
  versions?: string[];
  pokemon: {
    pokemon_id?: number;
    name_en: string;
    name_ko?: string;
    level: number;
    dynamax?: boolean;
    gigantamax?: boolean;
  }[];
}

interface RawStoryGymFile {
  battles?: RawGymEntry[];
  gyms?: RawGymEntry[];
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

/** 체육관 order → RawGymEntry[] 매핑 생성 */
function buildGymByOrderMap(gymRaw: RawStoryGymFile): Map<number, RawGymEntry[]> {
  const gymByOrder = new Map<number, RawGymEntry[]>();
  const entries = gymRaw.battles ?? gymRaw.gyms ?? [];
  for (const gym of entries) {
    const existing = gymByOrder.get(gym.order) || [];
    existing.push(gym);
    gymByOrder.set(gym.order, existing);
  }
  return gymByOrder;
}

/** 체육관 섹션 → StoryPoint 변환 (매칭 시 반환, 미매칭 시 null) */
function tryParseGymStoryPoint(
  sp: RawStoryPoint,
  gymByOrder: Map<number, RawGymEntry[]>
): StoryPoint | null {
  if (!sp.section.includes("체육관")) return null;
  if (sp.type !== "town" && sp.type !== "city") return null;

  const gymNumMatch = sp.section.match(/(\d+)번째/);
  if (!gymNumMatch) return null;

  const gymOrder = parseInt(gymNumMatch[1]);
  const gyms = gymByOrder.get(gymOrder);
  if (!gyms || gyms.length === 0) return null;

  const gym = gyms[0];
  const bossLevel = Math.max(...gym.pokemon.map((p) => p.level));
  return {
    id: `gym-${gymOrder}-${sp.location_id}`,
    gameId: "sword-shield",
    order: sp.order,
    type: "gym" as StoryPointType,
    bossType: [convertTypeToKo(gym.type)],
    bossLevel,
    name: `${sp.location_name} 체육관 (${gym.leader})`,
  };
}

/** 챔피언 섹션 → StoryPoint 변환 (매칭 시 반환, 미매칭 시 null) */
function tryParseChampionStoryPoint(sp: RawStoryPoint): StoryPoint | null {
  if (!sp.section.includes("챔피언") || sp.type !== "city") return null;
  return {
    id: `champion-${sp.location_id}`,
    gameId: "sword-shield",
    order: sp.order,
    type: "champion" as StoryPointType,
    bossType: ["격투" as PokemonType],
    bossLevel: 65,
    name: `${sp.location_name} 챔피언컵`,
  };
}

/** 일반 스토리 포인트 생성 */
function createGenericStoryPoint(sp: RawStoryPoint): StoryPoint {
  return {
    id: sp.location_id,
    gameId: "sword-shield",
    order: sp.order,
    type: "rival" as StoryPointType,
    bossType: [],
    bossLevel: 0,
    name: sp.location_name,
  };
}

function loadRawStoryFile(gameId?: string): RawStoryFile {
  const files = getGameFiles(gameId);
  const cacheKey = files.story;
  const cached = cGet<RawStoryFile>("rawStory");
  if (cached && cGet<string>("rawStoryVersion") === cacheKey) return cached;
  const result = readJsonFile<RawStoryFile>("story", files.story);
  cSet("rawStory", result);
  cSet("rawStoryVersion", cacheKey);
  return result;
}

/**
 * 스토리 포인트 데이터 로드
 * story-order + gyms 데이터를 합쳐 StoryPoint[] 생성
 * @param gameId - 게임 ID (없으면 기본값 'gen8-sword')
 */
export function loadStoryData(gameId?: string): StoryPoint[] {
  const files = getGameFiles(gameId);
  const cacheKey = files.story;
  const cached = cGet<StoryPoint[]>("storyPoints");
  if (cached && cGet<string>("storyVersion") === cacheKey) return cached;

  const storyRaw = loadRawStoryFile(gameId);
  const gymRaw = readJsonFile<RawStoryGymFile>("story", files.gyms);
  const gymByOrder = buildGymByOrderMap(gymRaw);

  const storyPoints: StoryPoint[] = [];

  for (const sp of storyRaw.story_points) {
    const gymPoint = tryParseGymStoryPoint(sp, gymByOrder);
    if (gymPoint) { storyPoints.push(gymPoint); continue; }

    const champPoint = tryParseChampionStoryPoint(sp);
    if (champPoint) { storyPoints.push(champPoint); continue; }

    storyPoints.push(createGenericStoryPoint(sp));
  }

  cSet("storyPoints", storyPoints);
  cSet("storyVersion", cacheKey);
  return storyPoints;
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
  story_order?: number;
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
 * @param gameId - 게임 ID (없으면 기본값 'gen8-sword')
 */
export function loadEncounters(gameId?: string): Encounter[] {
  const files = getGameFiles(gameId);
  const cacheKey = files.encounters;
  const cachedEnc = cGet<Encounter[]>("encounters");
  if (cachedEnc && cGet<string>("encountersVersion") === cacheKey) return cachedEnc;

  const raw = readJsonFile<RawEncounterFile>("encounter", files.encounters);
  loadPokemonData(gameId); // 캐시 보장 (해당 게임 버전의 포켓몬 데이터)

  // loadPokemonData에서 구축된 name_en -> id 캐시 재사용 (중복 파싱 방지)
  const nameToId = cGet<Map<string, number>>("pokemonNameEnToId") ?? new Map<string, number>();

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
        storyOrder: loc.story_order ?? 0,
        method,
        levelRange: enc.level_range,
        rarity,
      });
    }
  }

  cSet("encounters", encounters);
  cSet("encountersVersion", cacheKey);
  return encounters;
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
  const cached = cGet<TypeChart>("typeChart");
  if (cached) return cached;

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

  const result = chart as TypeChart;
  cSet("typeChart", result);
  return result;
}

// ========================================
// 유틸리티 함수
// ========================================

/** storyPointOrder+gameId별 캐시 (#25 최적화) */
const availablePokemonIdsCache = new Map<string, Set<number>>();

/**
 * 특정 스토리 포인트까지 잡을 수 있는 포켓몬 ID 목록
 */
export function getAvailablePokemonIds(storyPointOrder: number, gameId?: string): Set<number> {
  const cacheKey = `${storyPointOrder}:${gameId ?? "sword"}`;
  const cached = availablePokemonIdsCache.get(cacheKey);
  if (cached) return cached;

  const encounters = loadEncounters(gameId);
  const storyData = loadStoryData(gameId);

  // storyPointId → order 매핑 (story_order가 없는 encounter의 폴백용)
  const storyOrderMap = new Map<string, number>();
  for (const sp of storyData) {
    storyOrderMap.set(sp.id, sp.order);
  }
  // story 원본의 location_id도 추가
  const storyRaw = loadRawStoryFile(gameId);
  for (const sp of storyRaw.story_points) {
    if (!storyOrderMap.has(sp.location_id)) {
      storyOrderMap.set(sp.location_id, sp.order);
    }
  }

  const availableIds = new Set<number>();
  for (const enc of encounters) {
    const order = enc.storyOrder > 0
      ? enc.storyOrder
      : storyOrderMap.get(enc.storyPointId);
    if (order !== undefined && order <= storyPointOrder) {
      availableIds.add(enc.pokemonId);
    }
  }

  availablePokemonIdsCache.set(cacheKey, availableIds);
  return availableIds;
}

function buildPokemonIdMap(allPokemon: Pokemon[]): Map<number, Pokemon> {
  const cached = cGet<Map<number, Pokemon>>("pokemonById");
  if (cached) return cached;
  const result = new Map<number, Pokemon>();
  for (const p of allPokemon) {
    result.set(p.id, p);
  }
  cSet("pokemonById", result);
  return result;
}

/**
 * 포켓몬 ID로 포켓몬 데이터 조회 — O(1) Map 조회
 */
export function getPokemonById(id: number, gameVersion?: string): Pokemon | undefined {
  const allPokemon = loadPokemonData(gameVersion);
  const idMap = buildPokemonIdMap(allPokemon);
  return idMap.get(id);
}

/**
 * 유효한 gameVersion인지 검증 (GAME_FILE_MAP에 존재하는지 확인)
 */
export function isValidGameVersion(gameVersion: string): boolean {
  return gameVersion in GAME_FILE_MAP;
}

/**
 * 캐시 초기화 (테스트용)
 */
export function clearCache(): void {
  dataCache.clear();
  availablePokemonIdsCache.clear();
}
