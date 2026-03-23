/**
 * 파티 등급 산출 모듈
 * 3축 점수(공격 커버리지, 방어 밸런스, 타입 다양성)를 기반으로 S~D 등급 판정
 */
import type {
  AnalysisResult,
  GradeInfo,
  PartyGrade,
  PokemonType,
} from "@/types/pokemon";
import { ALL_TYPES } from "@/lib/type-calc";

/**
 * 파티 등급을 계산합니다.
 * @param analysis 기존 타입 분석 결과
 * @param partyTypes 각 파티 멤버의 타입 배열
 * @returns GradeInfo 등급 정보
 */
export function calculateGrade(
  analysis: AnalysisResult,
  partyTypes: PokemonType[][]
): GradeInfo {
  // 1. 공격 커버리지 점수 (0~100)
  const offense = (analysis.coverage.length / 18) * 100;

  // 2. 방어 밸런스 점수 (0~100)
  const defense = Math.max(
    0,
    Math.min(
      100,
      ((18 - analysis.weaknesses.length * 2 + analysis.resistances.length) / 18) * 100
    )
  );

  // 3. 타입 다양성 점수 (0~100)
  const uniqueTypes = new Set<PokemonType>();
  for (const types of partyTypes) {
    for (const t of types) {
      uniqueTypes.add(t);
    }
  }
  const maxTypes = Math.min(partyTypes.length * 2, 18);
  const diversity = maxTypes > 0 ? (uniqueTypes.size / maxTypes) * 100 : 0;

  // 4. 종합 점수 (6마리 미만 페널티: 빈 슬롯당 -5점)
  const partySize = partyTypes.length;
  const sizePenalty = partySize < 6 ? (6 - partySize) * 5 : 0;
  const totalScore = Math.max(0, Math.round(offense * 0.4 + defense * 0.4 + diversity * 0.2) - sizePenalty);

  // 5. 등급 판정
  const grade = getGradeFromScore(totalScore);

  // 6. 개선 제안 생성
  const suggestions: string[] = [];

  // 약점 제안
  for (const weakType of analysis.weaknesses) {
    suggestions.push(`${weakType} 타입에 대한 방어가 취약합니다`);
  }

  // 미커버 공격 타입 제안
  const coveredSet = new Set(analysis.coverage);
  const uncovered = ALL_TYPES.filter((t) => !coveredSet.has(t));
  if (uncovered.length > 0) {
    suggestions.push(
      `${uncovered.join(", ")} 타입을 효과적으로 공격할 수 없습니다`
    );
  }

  // 인원 부족 제안
  if (partySize < 6) {
    suggestions.push(`파티가 ${partySize}마리뿐입니다. ${6 - partySize}마리를 더 추가해보세요`);
  }

  // 다양성 부족 제안
  if (diversity < 50) {
    suggestions.push("타입이 편중되어 있습니다. 다양한 타입을 추가해보세요");
  }

  return {
    grade,
    totalScore,
    breakdown: {
      offense: Math.round(offense),
      defense: Math.round(defense),
      diversity: Math.round(diversity),
    },
    suggestions,
  };
}

/** 점수에서 등급 판정 */
function getGradeFromScore(score: number): PartyGrade {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

/** 등급별 텍스트 색상 (Tailwind) */
export function getGradeColor(grade: PartyGrade): string {
  switch (grade) {
    case "S": return "text-violet-500";
    case "A": return "text-blue-500";
    case "B": return "text-green-500";
    case "C": return "text-yellow-500";
    case "D": return "text-red-500";
  }
}

/** 등급별 한국어 라벨 */
export function getGradeLabel(grade: PartyGrade): string {
  switch (grade) {
    case "S": return "완벽";
    case "A": return "우수";
    case "B": return "양호";
    case "C": return "보통";
    case "D": return "부족";
  }
}

/** 등급별 배경색 (Tailwind) */
export function getGradeBgColor(grade: PartyGrade): string {
  switch (grade) {
    case "S": return "bg-violet-50";
    case "A": return "bg-blue-50";
    case "B": return "bg-green-50";
    case "C": return "bg-yellow-50";
    case "D": return "bg-red-50";
  }
}
