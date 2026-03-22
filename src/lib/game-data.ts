/**
 * 게임 데이터 매핑 — JSON 파일 기반 세대별 게임 목록
 *
 * data/pokemon/, data/encounter/, data/story/ 디렉토리의 파일을 기준으로
 * 세대별 게임 목록을 정의하고 활성/비활성 상태를 결정합니다.
 *
 * 활성 기준: encounter + story 데이터가 모두 존재하는 게임
 */

export interface GameEntry {
  /** 고유 ID (pokemon JSON의 game 필드 기준, 예: "red", "sword") */
  id: string;
  /** 한글 표시 이름 */
  label: string;
  /** 아이콘 이모지 */
  icon: string;
  /** 세대 번호 */
  generation: number;
  /** 리전 */
  region: string;
  /** DLC 여부 */
  isDlc: boolean;
  /** encounter 데이터 파일명 (없으면 null) */
  encounterFile: string | null;
  /** story 데이터 그룹 키 (story JSON의 game 필드) */
  storyGroup: string | null;
  /** 리메이크/파생 여부 */
  isRemake: boolean;
}

export interface GenerationGroup {
  generation: number;
  label: string;
  region: string;
  games: GameEntry[];
}

/**
 * pokemon game ID → story game 그룹 매핑
 * story 파일은 버전 쌍/그룹 단위로 공유됨
 */
const STORY_GROUP_MAP: Record<string, string> = {
  // Gen 1
  red: 'red-green-blue',
  green: 'red-green-blue',
  blue: 'red-green-blue',
  yellow: 'yellow',
  firered: 'firered-leafgreen',
  leafgreen: 'firered-leafgreen',
  lgp: 'lgp-lge',
  lge: 'lgp-lge',
  // Gen 2
  gold: 'gold-silver',
  silver: 'gold-silver',
  crystal: 'crystal',
  heartgold: 'heartgold-soulsilver',
  soulsilver: 'heartgold-soulsilver',
  // Gen 3
  ruby: 'ruby-sapphire',
  sapphire: 'ruby-sapphire',
  emerald: 'emerald',
  omegaruby: 'omegaruby-alphasapphire',
  alphasapphire: 'omegaruby-alphasapphire',
  // Gen 4
  diamond: 'diamond-pearl',
  pearl: 'diamond-pearl',
  platinum: 'platinum',
  brilliantdiamond: 'brilliantdiamond-shiningpearl',
  shiningpearl: 'brilliantdiamond-shiningpearl',
  legendsarceus: 'legendsarceus',
  // Gen 5
  black: 'black-white',
  white: 'black-white',
  black2: 'black2-white2',
  white2: 'black2-white2',
  // Gen 6
  x: 'x-y',
  y: 'x-y',
  legendsza: 'legendsza',
  // Gen 7
  sun: 'sun-moon',
  moon: 'sun-moon',
  ultrasun: 'ultrasun-ultramoon',
  ultramoon: 'ultrasun-ultramoon',
  // Gen 8
  sword: 'sword',
  shield: 'shield',
  'sword-ct': 'sword-shield-ct',
  'shield-ct': 'sword-shield-ct',
  'sword-ioa': 'sword-shield-ioa',
  'shield-ioa': 'sword-shield-ioa',
  // Gen 9
  scarlet: 'scarlet-violet',
  violet: 'scarlet-violet',
  'scarlet-id': 'scarlet-violet-id',
  'violet-id': 'scarlet-violet-id',
  'scarlet-tm': 'scarlet-violet-tm',
  'violet-tm': 'scarlet-violet-tm',
};

/** story 데이터가 존재하는 그룹 목록 (data/story/ 파일 기준) */
const AVAILABLE_STORY_GROUPS = new Set([
  'red-green-blue', 'yellow', 'firered-leafgreen', 'lgp-lge',
  'gold-silver', 'crystal', 'heartgold-soulsilver',
  'ruby-sapphire', 'emerald', 'omegaruby-alphasapphire',
  'diamond-pearl', 'platinum', 'brilliantdiamond-shiningpearl', 'legendsarceus',
  'black-white', 'black2-white2',
  'x-y', 'legendsza',
  'sun-moon', 'ultrasun-ultramoon',
  'sword', 'shield', 'sword-shield-ct', 'sword-shield-ioa',
  'scarlet-violet', 'scarlet-violet-id', 'scarlet-violet-tm',
]);

/** encounter 데이터가 존재하는 게임 ID 목록 (data/encounter/ 파일 기준) */
const AVAILABLE_ENCOUNTERS = new Set([
  'red', 'green', 'blue', 'yellow', 'firered', 'leafgreen', 'lgp', 'lge',
  'gold', 'silver', 'crystal', 'heartgold', 'soulsilver',
  'ruby', 'sapphire', 'emerald', 'omegaruby', 'alphasapphire',
  'diamond', 'pearl', 'platinum', 'brilliantdiamond', 'shiningpearl', 'legendsarceus',
  'black', 'white', 'black2', 'white2',
  'x', 'y', 'legendsza',
  'sun', 'moon', 'ultrasun', 'ultramoon',
  'sword', 'shield', 'sword-ct', 'shield-ct', 'sword-ioa', 'shield-ioa',
  'scarlet', 'violet', 'scarlet-id', 'violet-id', 'scarlet-tm', 'violet-tm',
]);

/** 전체 게임 목록 정의 (DLC 제외한 본편 우선) */
const ALL_GAMES: GameEntry[] = [
  // === Gen 1: 관동 ===
  { id: 'red', label: '레드', icon: '🔴', generation: 1, region: 'kanto', isDlc: false, encounterFile: 'gen1-red-encounters.json', storyGroup: 'red-green-blue', isRemake: false },
  { id: 'green', label: '그린', icon: '🟢', generation: 1, region: 'kanto', isDlc: false, encounterFile: 'gen1-green-encounters.json', storyGroup: 'red-green-blue', isRemake: false },
  { id: 'blue', label: '블루', icon: '🔵', generation: 1, region: 'kanto', isDlc: false, encounterFile: 'gen1-blue-encounters.json', storyGroup: 'red-green-blue', isRemake: false },
  { id: 'yellow', label: '피카츄', icon: '⚡', generation: 1, region: 'kanto', isDlc: false, encounterFile: 'gen1-yellow-encounters.json', storyGroup: 'yellow', isRemake: false },
  { id: 'firered', label: '파이어레드', icon: '🔥', generation: 1, region: 'kanto', isDlc: false, encounterFile: 'gen1-firered-encounters.json', storyGroup: 'firered-leafgreen', isRemake: true },
  { id: 'leafgreen', label: '리프그린', icon: '🍃', generation: 1, region: 'kanto', isDlc: false, encounterFile: 'gen1-leafgreen-encounters.json', storyGroup: 'firered-leafgreen', isRemake: true },
  { id: 'lgp', label: "Let's Go 피카츄", icon: '⚡', generation: 1, region: 'kanto', isDlc: false, encounterFile: 'gen1-lgp-encounters.json', storyGroup: 'lgp-lge', isRemake: true },
  { id: 'lge', label: "Let's Go 이브이", icon: '🤎', generation: 1, region: 'kanto', isDlc: false, encounterFile: 'gen1-lge-encounters.json', storyGroup: 'lgp-lge', isRemake: true },

  // === Gen 2: 성도 ===
  { id: 'gold', label: '골드', icon: '🥇', generation: 2, region: 'johto', isDlc: false, encounterFile: 'gen2-gold-encounters.json', storyGroup: 'gold-silver', isRemake: false },
  { id: 'silver', label: '실버', icon: '🥈', generation: 2, region: 'johto', isDlc: false, encounterFile: 'gen2-silver-encounters.json', storyGroup: 'gold-silver', isRemake: false },
  { id: 'crystal', label: '크리스탈', icon: '💎', generation: 2, region: 'johto', isDlc: false, encounterFile: 'gen2-crystal-encounters.json', storyGroup: 'crystal', isRemake: false },
  { id: 'heartgold', label: '하트골드', icon: '💛', generation: 2, region: 'johto', isDlc: false, encounterFile: 'gen2-heartgold-encounters.json', storyGroup: 'heartgold-soulsilver', isRemake: true },
  { id: 'soulsilver', label: '소울실버', icon: '🤍', generation: 2, region: 'johto', isDlc: false, encounterFile: 'gen2-soulsilver-encounters.json', storyGroup: 'heartgold-soulsilver', isRemake: true },

  // === Gen 3: 호연 ===
  { id: 'ruby', label: '루비', icon: '🔴', generation: 3, region: 'hoenn', isDlc: false, encounterFile: 'gen3-ruby-encounters.json', storyGroup: 'ruby-sapphire', isRemake: false },
  { id: 'sapphire', label: '사파이어', icon: '🔵', generation: 3, region: 'hoenn', isDlc: false, encounterFile: 'gen3-sapphire-encounters.json', storyGroup: 'ruby-sapphire', isRemake: false },
  { id: 'emerald', label: '에메랄드', icon: '💚', generation: 3, region: 'hoenn', isDlc: false, encounterFile: 'gen3-emerald-encounters.json', storyGroup: 'emerald', isRemake: false },
  { id: 'omegaruby', label: '오메가루비', icon: '❤️', generation: 3, region: 'hoenn', isDlc: false, encounterFile: 'gen3-omegaruby-encounters.json', storyGroup: 'omegaruby-alphasapphire', isRemake: true },
  { id: 'alphasapphire', label: '알파사파이어', icon: '💙', generation: 3, region: 'hoenn', isDlc: false, encounterFile: 'gen3-alphasapphire-encounters.json', storyGroup: 'omegaruby-alphasapphire', isRemake: true },

  // === Gen 4: 신오/히스이 ===
  { id: 'diamond', label: '다이아몬드', icon: '💠', generation: 4, region: 'sinnoh', isDlc: false, encounterFile: 'gen4-diamond-encounters.json', storyGroup: 'diamond-pearl', isRemake: false },
  { id: 'pearl', label: '펄', icon: '🫧', generation: 4, region: 'sinnoh', isDlc: false, encounterFile: 'gen4-pearl-encounters.json', storyGroup: 'diamond-pearl', isRemake: false },
  { id: 'platinum', label: '플라티나', icon: '⬜', generation: 4, region: 'sinnoh', isDlc: false, encounterFile: 'gen4-platinum-encounters.json', storyGroup: 'platinum', isRemake: false },
  { id: 'brilliantdiamond', label: '브릴리언트 다이아몬드', icon: '💎', generation: 4, region: 'sinnoh', isDlc: false, encounterFile: 'gen4-brilliantdiamond-encounters.json', storyGroup: 'brilliantdiamond-shiningpearl', isRemake: true },
  { id: 'shiningpearl', label: '샤이닝 펄', icon: '🌟', generation: 4, region: 'sinnoh', isDlc: false, encounterFile: 'gen4-shiningpearl-encounters.json', storyGroup: 'brilliantdiamond-shiningpearl', isRemake: true },
  { id: 'legendsarceus', label: '레전드 아르세우스', icon: '⭐', generation: 4, region: 'hisui', isDlc: false, encounterFile: 'gen4-legendsarceus-encounters.json', storyGroup: 'legendsarceus', isRemake: false },

  // === Gen 5: 하나 ===
  { id: 'black', label: '블랙', icon: '⚫', generation: 5, region: 'unova', isDlc: false, encounterFile: 'gen5-black-encounters.json', storyGroup: 'black-white', isRemake: false },
  { id: 'white', label: '화이트', icon: '⚪', generation: 5, region: 'unova', isDlc: false, encounterFile: 'gen5-white-encounters.json', storyGroup: 'black-white', isRemake: false },
  { id: 'black2', label: '블랙 2', icon: '⚫', generation: 5, region: 'unova', isDlc: false, encounterFile: 'gen5-black2-encounters.json', storyGroup: 'black2-white2', isRemake: false },
  { id: 'white2', label: '화이트 2', icon: '⚪', generation: 5, region: 'unova', isDlc: false, encounterFile: 'gen5-white2-encounters.json', storyGroup: 'black2-white2', isRemake: false },

  // === Gen 6: 칼로스 ===
  { id: 'x', label: 'X', icon: '🔵', generation: 6, region: 'kalos', isDlc: false, encounterFile: 'gen6-x-encounters.json', storyGroup: 'x-y', isRemake: false },
  { id: 'y', label: 'Y', icon: '🔴', generation: 6, region: 'kalos', isDlc: false, encounterFile: 'gen6-y-encounters.json', storyGroup: 'x-y', isRemake: false },
  { id: 'legendsza', label: 'LEGENDS Z-A', icon: '✨', generation: 6, region: 'kalos', isDlc: false, encounterFile: 'gen6-legendsza-encounters.json', storyGroup: 'legendsza', isRemake: false },

  // === Gen 7: 알로라 ===
  { id: 'sun', label: '썬', icon: '☀️', generation: 7, region: 'alola', isDlc: false, encounterFile: 'gen7-sun-encounters.json', storyGroup: 'sun-moon', isRemake: false },
  { id: 'moon', label: '문', icon: '🌙', generation: 7, region: 'alola', isDlc: false, encounterFile: 'gen7-moon-encounters.json', storyGroup: 'sun-moon', isRemake: false },
  { id: 'ultrasun', label: '울트라썬', icon: '🌞', generation: 7, region: 'alola', isDlc: false, encounterFile: 'gen7-ultrasun-encounters.json', storyGroup: 'ultrasun-ultramoon', isRemake: false },
  { id: 'ultramoon', label: '울트라문', icon: '🌝', generation: 7, region: 'alola', isDlc: false, encounterFile: 'gen7-ultramoon-encounters.json', storyGroup: 'ultrasun-ultramoon', isRemake: false },

  // === Gen 8: 가라르 ===
  { id: 'sword', label: '소드', icon: '🗡️', generation: 8, region: 'galar', isDlc: false, encounterFile: 'gen8-sword-encounters.json', storyGroup: 'sword', isRemake: false },
  { id: 'shield', label: '실드', icon: '🛡️', generation: 8, region: 'galar', isDlc: false, encounterFile: 'gen8-shield-encounters.json', storyGroup: 'shield', isRemake: false },
  { id: 'sword-ioa', label: '소드: 갑옷의 외딴섬', icon: '🗡️', generation: 8, region: 'galar', isDlc: true, encounterFile: 'gen8-sword-ioa-encounters.json', storyGroup: 'sword-shield-ioa', isRemake: false },
  { id: 'shield-ioa', label: '실드: 갑옷의 외딴섬', icon: '🛡️', generation: 8, region: 'galar', isDlc: true, encounterFile: 'gen8-shield-ioa-encounters.json', storyGroup: 'sword-shield-ioa', isRemake: false },
  { id: 'sword-ct', label: '소드: 왕관의 설원', icon: '🗡️', generation: 8, region: 'galar', isDlc: true, encounterFile: 'gen8-sword-ct-encounters.json', storyGroup: 'sword-shield-ct', isRemake: false },
  { id: 'shield-ct', label: '실드: 왕관의 설원', icon: '🛡️', generation: 8, region: 'galar', isDlc: true, encounterFile: 'gen8-shield-ct-encounters.json', storyGroup: 'sword-shield-ct', isRemake: false },

  // === Gen 9: 팔데아 ===
  { id: 'scarlet', label: '스칼렛', icon: '🔴', generation: 9, region: 'paldea', isDlc: false, encounterFile: 'gen9-scarlet-encounters.json', storyGroup: 'scarlet-violet', isRemake: false },
  { id: 'violet', label: '바이올렛', icon: '🟣', generation: 9, region: 'paldea', isDlc: false, encounterFile: 'gen9-violet-encounters.json', storyGroup: 'scarlet-violet', isRemake: false },
  { id: 'scarlet-tm', label: '스칼렛: 벽옥의 가면', icon: '🔴', generation: 9, region: 'kitakami', isDlc: true, encounterFile: 'gen9-scarlet-tm-encounters.json', storyGroup: 'scarlet-violet-tm', isRemake: false },
  { id: 'violet-tm', label: '바이올렛: 벽옥의 가면', icon: '🟣', generation: 9, region: 'kitakami', isDlc: true, encounterFile: 'gen9-violet-tm-encounters.json', storyGroup: 'scarlet-violet-tm', isRemake: false },
  { id: 'scarlet-id', label: '스칼렛: 남청의 원반', icon: '🔴', generation: 9, region: 'blueberry', isDlc: true, encounterFile: 'gen9-scarlet-id-encounters.json', storyGroup: 'scarlet-violet-id', isRemake: false },
  { id: 'violet-id', label: '바이올렛: 남청의 원반', icon: '🟣', generation: 9, region: 'blueberry', isDlc: true, encounterFile: 'gen9-violet-id-encounters.json', storyGroup: 'scarlet-violet-id', isRemake: false },
];

/** 게임이 활성(encounter + story 모두 존재) 상태인지 판단 */
export function isGameEnabled(game: GameEntry): boolean {
  const hasEncounter = game.encounterFile !== null && AVAILABLE_ENCOUNTERS.has(game.id);
  const hasStory = game.storyGroup !== null && AVAILABLE_STORY_GROUPS.has(game.storyGroup);
  return hasEncounter && hasStory;
}

/** 리전 한글명 매핑 */
const REGION_LABELS: Record<string, string> = {
  kanto: '관동',
  johto: '성도',
  hoenn: '호연',
  sinnoh: '신오',
  hisui: '히스이',
  unova: '하나',
  kalos: '칼로스',
  alola: '알로라',
  galar: '가라르',
  paldea: '팔데아',
  kitakami: '키타카미',
  blueberry: '블루베리',
};

/** 리전 한글명 반환 */
export function getRegionLabel(region: string): string {
  return REGION_LABELS[region] ?? region;
}

/** 세대별 그룹핑된 게임 목록 반환 (DLC는 본편 아래 별도 표시) */
export function getGamesByGeneration(): GenerationGroup[] {
  const genMap = new Map<number, GenerationGroup>();

  for (const game of ALL_GAMES) {
    if (!genMap.has(game.generation)) {
      genMap.set(game.generation, {
        generation: game.generation,
        label: `${game.generation}세대`,
        region: getRegionLabel(game.region),
        games: [],
      });
    }
    genMap.get(game.generation)!.games.push(game);
  }

  // 세대를 최신순으로 정렬 (9→1)
  return Array.from(genMap.values()).sort((a, b) => b.generation - a.generation);
}

/** 전체 게임 목록 (플랫 배열) */
export function getAllGames(): GameEntry[] {
  return [...ALL_GAMES];
}

/** 게임 ID로 GameEntry 조회 */
export function getGameById(id: string): GameEntry | undefined {
  return ALL_GAMES.find((g) => g.id === id);
}

/** 게임 ID에 대응하는 story 그룹 키 반환 */
export function getStoryGroupForGame(gameId: string): string | null {
  return STORY_GROUP_MAP[gameId] ?? null;
}

/** 활성 게임 수 */
export function getEnabledGameCount(): number {
  return ALL_GAMES.filter(isGameEnabled).length;
}

/** 전체 게임 수 */
export function getTotalGameCount(): number {
  return ALL_GAMES.length;
}
