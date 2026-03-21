'use client';

import type { Move, PokemonType } from '@/types/pokemon';
import { UI } from '@/lib/ui-tokens';
import TypeBadge from '@/components/TypeBadge';

interface MoveTableProps {
  moves: Move[];
  pokemonTypes: PokemonType[];
}

export default function MoveTable({ moves, pokemonTypes }: MoveTableProps) {
  const sorted = [...moves].sort((a, b) => a.learnLevel - b.learnLevel);

  if (sorted.length === 0) {
    return <p className="text-sm text-slate-400">기술 정보 없음</p>;
  }

  return (
    <div className={`${UI.border} overflow-hidden`}>
      <div className="max-h-96 overflow-y-auto overscroll-contain">
        <table className="w-full text-sm table-fixed">
          <thead className={`sticky top-0 ${UI.tableHeader} z-10`}>
            <tr className={`border-b ${UI.rowBorder} text-slate-700`}>
              <th className="text-center py-2 font-bold w-[40px]">Lv</th>
              <th className="text-center py-2 font-bold">기술명</th>
              <th className="text-center py-2 font-bold w-[60px]">타입</th>
              <th className="text-center py-2 font-bold w-[44px]">분류</th>
              <th className="text-center py-2 font-bold w-[44px]">위력</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((move) => (
              <tr
                key={`${move.id}-${move.learnLevel}`}
                className={`border-b ${UI.innerBorder} ${UI.hoverBg} transition-colors`}
              >
                <td className="py-1.5 text-center text-slate-400 tabular-nums">
                  {move.learnLevel}
                </td>
                <td className="py-1.5 text-center text-slate-900 font-medium truncate">
                  {move.name}
                  {move.power > 0 && pokemonTypes.includes(move.type) && (
                    <span className="text-amber-500 ml-0.5">★</span>
                  )}
                </td>
                <td className="py-1.5 text-center">
                  <TypeBadge type={move.type} size="sm" />
                </td>
                <td className="py-1.5 text-center text-slate-500">
                  {move.category}
                </td>
                <td className="py-1.5 text-center text-slate-900 tabular-nums">
                  {move.category === '변화' ? '-' : move.power}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
