/**
 * 역할 분류 모듈
 * 포켓몬의 종족값 기반 역할 분류 (5역할 + 미분류)
 */
import type { BaseStats, PokemonRole, Pokemon } from "@/types/pokemon";

// ========================================
// 역할 분류
// ========================================

/**
 * 종족값 기반 역할 자동 분류
 *
 * 분류 기준:
 * - 쌍두형: 공격 >= 80 & 특공 >= 80 & |공격-특공| <= 10
 * - 물리방어: 방어 > max(공격,특공) & 방어 >= 80
 * - 특수방어: 특방 > max(공격,특공) & 특방 >= 80
 * - 물리형: 공격 >= 특공
 * - 특공형: 특공 > 공격
 *
 * 진화 가능 포켓몬은 미분류로 분류 (canEvolve 파라미터)
 */
export function classifyRole(pokemon: Pokemon): PokemonRole {
  const canEvolve =
    pokemon.evolutions !== undefined && pokemon.evolutions.length > 0;
  return classifyRoleFromStats(pokemon.stats, canEvolve);
}

/**
 * 종족값만으로 역할 분류
 * @param canEvolve - 진화 가능 여부 (true면 미분류)
 */
export function classifyRoleFromStats(
  stats: BaseStats,
  canEvolve: boolean = false
): PokemonRole {
  if (canEvolve) return "미분류";

  const atkDiff = Math.abs(stats.atk - stats.spa);
  const bothAttackHigh = stats.atk >= 80 && stats.spa >= 80;

  // 쌍두형: 공격/특공 둘 다 80 이상, 차이 10 이하
  if (bothAttackHigh && atkDiff <= 10) return "쌍두형";

  const bestAtk = Math.max(stats.atk, stats.spa);

  // 물리방어: 방어가 공격계 최대보다 높고 80 이상
  if (stats.def > bestAtk && stats.def >= 80) return "물리방어";

  // 특수방어: 특방이 공격계 최대보다 높고 80 이상
  if (stats.spd > bestAtk && stats.spd >= 80) return "특수방어";

  // 물리형 vs 특공형
  if (stats.atk >= stats.spa) return "물리형";
  return "특공형";
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
  물리형: {
    label: "물리형",
    icon: "Sword",
    color: "text-red-600",
    bgColor: "bg-red-100",
    description: "공격이 높아 물리 기술 위주로 싸우는 역할",
  },
  특공형: {
    label: "특공형",
    icon: "Sparkles",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "특공이 높아 특수 기술 위주로 싸우는 역할",
  },
  쌍두형: {
    label: "쌍두형",
    icon: "Swords",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    description: "공격과 특공 모두 높아 양쪽 기술을 활용하는 역할",
  },
  물리방어: {
    label: "물리방어",
    icon: "Shield",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    description: "높은 방어력으로 물리 공격을 견디는 역할",
  },
  특수방어: {
    label: "특수방어",
    icon: "ShieldPlus",
    color: "text-green-600",
    bgColor: "bg-green-100",
    description: "높은 특방으로 특수 공격을 견디는 역할",
  },
  미분류: {
    label: "미분류",
    icon: "HelpCircle",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    description: "진화 가능한 포켓몬으로 역할이 아직 확정되지 않음",
  },
};
