import type {
  Pokemon,
  TypeChart,
  ComparePartyResult,
  ComparisonSummary,
  CompareResponse,
  CompareWinner,
} from "@/types/pokemon";
import { analyzeParty } from "@/lib/party-analysis";

function calcTotalBaseStats(pokemon: Pokemon[]): number {
  return pokemon.reduce((sum, p) => {
    const s = p.stats;
    return sum + s.hp + s.atk + s.def + s.spa + s.spd + s.spe;
  }, 0);
}

function judgeWinner(a: number, b: number): CompareWinner {
  if (a > b) return "A";
  if (b > a) return "B";
  return "tie";
}

function buildPartyResult(pokemon: Pokemon[], typeChart: TypeChart): ComparePartyResult {
  const partyTypes = pokemon.map((p) => p.types);
  const analysis = analyzeParty(partyTypes, typeChart);
  const totalBaseStats = calcTotalBaseStats(pokemon);
  return { pokemon, analysis, totalBaseStats };
}

export function compareParties(
  partyAData: Pokemon[],
  partyBData: Pokemon[],
  typeChart: TypeChart,
): CompareResponse {
  const partyA = buildPartyResult(partyAData, typeChart);
  const partyB = buildPartyResult(partyBData, typeChart);

  const coverageWinner = judgeWinner(
    partyA.analysis.coverageScore,
    partyB.analysis.coverageScore,
  );

  const defenseA = partyA.analysis.weaknesses.length;
  const defenseB = partyB.analysis.weaknesses.length;
  const defenseWinner = judgeWinner(defenseB, defenseA);

  const gradeA = partyA.analysis.gradeInfo?.totalScore ?? 0;
  const gradeB = partyB.analysis.gradeInfo?.totalScore ?? 0;
  const gradeWinner = judgeWinner(gradeA, gradeB);

  const statsWinner = judgeWinner(partyA.totalBaseStats, partyB.totalBaseStats);

  const diversityA = partyA.analysis.gradeInfo?.breakdown.diversity ?? 0;
  const diversityB = partyB.analysis.gradeInfo?.breakdown.diversity ?? 0;
  const diversityWinner = judgeWinner(diversityA, diversityB);

  const highlights = buildHighlights(partyA, partyB, {
    coverageWinner,
    defenseWinner,
    gradeWinner,
    statsWinner,
    diversityWinner,
  });

  return {
    partyA,
    partyB,
    comparison: {
      coverageWinner,
      defenseWinner,
      gradeWinner,
      statsWinner,
      diversityWinner,
      highlights,
    },
  };
}

function buildHighlights(
  partyA: ComparePartyResult,
  partyB: ComparePartyResult,
  winners: Omit<ComparisonSummary, "highlights">,
): string[] {
  const highlights: string[] = [];
  const label = (w: CompareWinner) => (w === "A" ? "파티 A" : w === "B" ? "파티 B" : null);

  const coverageLabel = label(winners.coverageWinner);
  if (coverageLabel) {
    const diff = Math.abs(partyA.analysis.coverageScore - partyB.analysis.coverageScore);
    highlights.push(`${coverageLabel}의 공격 커버리지가 ${diff}점 더 높습니다.`);
  } else {
    highlights.push("두 파티의 공격 커버리지가 동일합니다.");
  }

  const defenseLabel = label(winners.defenseWinner);
  if (defenseLabel) {
    highlights.push(`${defenseLabel}의 방어 밸런스가 더 우수합니다.`);
  }

  const gradeLabel = label(winners.gradeWinner);
  if (gradeLabel) {
    const gradeA = partyA.analysis.gradeInfo?.grade ?? "?";
    const gradeB = partyB.analysis.gradeInfo?.grade ?? "?";
    highlights.push(`등급: 파티 A ${gradeA} vs 파티 B ${gradeB} → ${gradeLabel} 우세`);
  }

  const statsLabel = label(winners.statsWinner);
  if (statsLabel) {
    const diff = Math.abs(partyA.totalBaseStats - partyB.totalBaseStats);
    highlights.push(`${statsLabel}의 종족값 합계가 ${diff} 더 높습니다.`);
  }

  const diversityLabel = label(winners.diversityWinner);
  if (diversityLabel) {
    highlights.push(`${diversityLabel}의 타입 다양성이 더 뛰어납니다.`);
  }

  return highlights;
}
