/**
 * 역할 분류 모듈
 * 포켓몬의 종족값 기반 역할 분류
 * algorithm.md의 역할 분류 기준을 따름
 */
import type { BaseStats, PokemonRole, Pokemon } from "@/types/pokemon";

// ========================================
// 역할 분류
// ========================================

/**
 * 종족값 기반 역할 자동 분류
 *
 * 분류 기준 (algorithm.md):
 * - 물리 어태커: 공격 > 100 & 공격 > 특공
 * - 특수 어태커: 특공 > 100 & 특공 > 공격
 * - 물리 탱커: 방어 > 100 & HP > 80
 * - 특수 탱커: 특방 > 100 & HP > 80
 * - 스피드형: 스피드 > 100
 * - 서포터: 나머지
 *
 * 추가: 올라운더 판정 (BST >= 500 && 특별히 튀는 스탯 없음)
 */
export function classifyRole(pokemon: Pokemon): PokemonRole {
  return classifyRoleFromStats(pokemon.stats);
}

/**
 * 종족값만으로 역할 분류
 */
export function classifyRoleFromStats(stats: BaseStats): PokemonRole {
  // 스피드형 우선 체크
  if (stats.spe > 100) return "스피드";

  // 물리 어태커
  if (stats.atk > 100 && stats.atk > stats.spa) return "물리어태커";

  // 특수 어태커
  if (stats.spa > 100 && stats.spa > stats.atk) return "특수어태커";

  // 물리 탱커
  if (stats.def > 100 && stats.hp > 80) return "물리탱커";

  // 특수 탱커
  if (stats.spd > 100 && stats.hp > 80) return "특수탱커";

  // 올라운더 (종족값 합 >= 500)
  const bst = stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
  if (bst >= 500) return "올라운더";

  // 서포터 (나머지)
  return "서포터";
}

// ========================================
// 역할별 아이콘/컬러 매핑
// ========================================

export interface RoleStyle {
  /** 역할 한국어 이름 */
  label: string;
  /** 역할 아이콘 (lucide-react 아이콘 이름) */
  icon: string;
  /** 역할 대표 색상 (Tailwind CSS 클래스) */
  color: string;
  /** 역할 배경 색상 */
  bgColor: string;
  /** 역할 설명 */
  description: string;
}

export const ROLE_STYLES: Record<PokemonRole, RoleStyle> = {
  물리어태커: {
    label: "물리 어태커",
    icon: "Sword",
    color: "text-red-600",
    bgColor: "bg-red-100",
    description: "높은 공격력으로 물리 기술 위주로 싸우는 역할",
  },
  특수어태커: {
    label: "특수 어태커",
    icon: "Sparkles",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "높은 특공으로 특수 기술 위주로 싸우는 역할",
  },
  물리탱커: {
    label: "물리 탱커",
    icon: "Shield",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    description: "높은 방어력과 HP로 물리 공격을 견디는 역할",
  },
  특수탱커: {
    label: "특수 탱커",
    icon: "ShieldPlus",
    color: "text-green-600",
    bgColor: "bg-green-100",
    description: "높은 특방과 HP로 특수 공격을 견디는 역할",
  },
  스피드: {
    label: "스피드형",
    icon: "Zap",
    color: "text-yellow-500",
    bgColor: "bg-yellow-100",
    description: "높은 스피드로 먼저 행동하는 역할",
  },
  올라운더: {
    label: "올라운더",
    icon: "Star",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "균형 잡힌 종족값으로 다양한 역할을 수행",
  },
  서포터: {
    label: "서포터",
    icon: "Heart",
    color: "text-pink-500",
    bgColor: "bg-pink-100",
    description: "변화기나 보조 기술로 팀을 지원하는 역할",
  },
};

// ========================================
// 파티 역할 밸런스
// ========================================

/**
 * 이상적 파티 구성 기준
 * - 물리 어태커 1~2
 * - 특수 어태커 1~2
 * - 탱커/서포터 1~2
 * - 스피드형 1~2
 */
export interface RoleBalance {
  /** 각 역할별 인원 수 */
  roleCounts: Record<PokemonRole, number>;
  /** 밸런스 점수 (0~100) */
  score: number;
  /** 밸런스 문제점 */
  issues: string[];
}

/**
 * 파티 역할 밸런스 계산
 */
export function calculateRoleBalance(roles: PokemonRole[]): RoleBalance {
  const roleCounts: Record<PokemonRole, number> = {
    물리어태커: 0,
    특수어태커: 0,
    물리탱커: 0,
    특수탱커: 0,
    스피드: 0,
    올라운더: 0,
    서포터: 0,
  };

  for (const role of roles) {
    roleCounts[role]++;
  }

  let score = 100;
  const issues: string[] = [];

  // 같은 역할 3마리 이상: 점수 감소
  for (const [role, count] of Object.entries(roleCounts)) {
    if (count >= 3) {
      score -= 20 * (count - 2);
      issues.push(`${ROLE_STYLES[role as PokemonRole].label}이(가) ${count}마리로 과다합니다`);
    }
  }

  // 물리/특수 편중 체크
  const physicalCount = roleCounts["물리어태커"];
  const specialCount = roleCounts["특수어태커"];
  if (physicalCount >= 3 && specialCount === 0) {
    score -= 15;
    issues.push("물리 공격에 편중되어 있습니다");
  }
  if (specialCount >= 3 && physicalCount === 0) {
    score -= 15;
    issues.push("특수 공격에 편중되어 있습니다");
  }

  // 어태커가 없으면 감점
  if (physicalCount === 0 && specialCount === 0) {
    score -= 20;
    issues.push("어태커가 없습니다");
  }

  // 점수 범위 제한
  score = Math.max(0, Math.min(100, score));

  return { roleCounts, score, issues };
}

/**
 * 파티에 필요한 역할 추천
 */
export function getNeededRoles(currentRoles: PokemonRole[]): PokemonRole[] {
  const balance = calculateRoleBalance(currentRoles);
  const needed: PokemonRole[] = [];

  // 어태커가 부족한 경우
  if (balance.roleCounts["물리어태커"] === 0) needed.push("물리어태커");
  if (balance.roleCounts["특수어태커"] === 0) needed.push("특수어태커");

  // 탱커가 없는 경우
  if (balance.roleCounts["물리탱커"] === 0 && balance.roleCounts["특수탱커"] === 0) {
    needed.push("물리탱커", "특수탱커");
  }

  // 스피드형이 없는 경우
  if (balance.roleCounts["스피드"] === 0) needed.push("스피드");

  return needed;
}
