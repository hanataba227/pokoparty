'use client';

import type { CompareResponse, CompareWinner } from '@/types/pokemon';
import { UI } from '@/lib/ui-tokens';

interface CompareResultTableProps {
  result: CompareResponse;
}

function WinnerCell({ value, winner, side }: { value: string | number; winner: CompareWinner; side: 'A' | 'B' }) {
  const isWinner = winner === side;
  const isTie = winner === 'tie';
  return (
    <td className={`px-4 py-3 text-center font-semibold ${
      isWinner ? 'bg-indigo-50 text-indigo-700' : isTie ? 'text-slate-600' : 'text-slate-400'
    }`}>
      {value}
      {isWinner && <span className="ml-1 text-xs text-indigo-500">&#9733;</span>}
    </td>
  );
}

export default function CompareResultTable({ result }: CompareResultTableProps) {
  const { partyA, partyB, comparison } = result;

  const gradeA = partyA.analysis.gradeInfo;
  const gradeB = partyB.analysis.gradeInfo;

  const rows: { label: string; valueA: string | number; valueB: string | number; winner: CompareWinner }[] = [
    {
      label: '등급',
      valueA: gradeA ? `${gradeA.grade} (${gradeA.totalScore}점)` : '-',
      valueB: gradeB ? `${gradeB.grade} (${gradeB.totalScore}점)` : '-',
      winner: comparison.gradeWinner,
    },
    {
      label: '종합 점수',
      valueA: gradeA?.totalScore ?? partyA.analysis.coverageScore,
      valueB: gradeB?.totalScore ?? partyB.analysis.coverageScore,
      winner: comparison.gradeWinner,
    },
    {
      label: '커버리지',
      valueA: `${Math.round((partyA.analysis.coverage.length / 18) * 100)}%`,
      valueB: `${Math.round((partyB.analysis.coverage.length / 18) * 100)}%`,
      winner: comparison.coverageWinner,
    },
    {
      label: '약점 수',
      valueA: partyA.analysis.weaknesses.length,
      valueB: partyB.analysis.weaknesses.length,
      winner: comparison.defenseWinner,
    },
    {
      label: '종족값 합계',
      valueA: partyA.totalBaseStats.toLocaleString(),
      valueB: partyB.totalBaseStats.toLocaleString(),
      winner: comparison.statsWinner,
    },
  ];

  return (
    <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} overflow-hidden`}>
      <table className="w-full">
        <thead>
          <tr className={UI.tableHeader}>
            <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 w-1/3">파티 A</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 w-1/3">항목</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 w-1/3">파티 B</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${UI.innerBorder}`}>
          {rows.map((row) => (
            <tr key={row.label}>
              <WinnerCell value={row.valueA} winner={row.winner} side="A" />
              <td className="px-4 py-3 text-center text-sm font-medium text-slate-700 bg-slate-50">
                {row.label}
              </td>
              <WinnerCell value={row.valueB} winner={row.winner} side="B" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
