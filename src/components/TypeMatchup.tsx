'use client';

import type { PokemonType, TypeChart } from '@/types/pokemon';
import { UI } from '@/lib/ui-tokens';
import TypeBadge from '@/components/TypeBadge';
import { ALL_TYPES } from '@/lib/type-calc';

interface TypeMatchupProps {
  types: PokemonType[];
  typeChart: TypeChart;
}

export default function TypeMatchup({ types, typeChart }: TypeMatchupProps) {
  // 배율별 그룹핑
  const groups: Record<string, PokemonType[]> = {
    '4': [], '2': [], '1': [], '0.5': [], '0.25': [], '0': [],
  };

  for (const attackType of ALL_TYPES) {
    let multiplier = 1;
    for (const defType of types) {
      multiplier *= typeChart[attackType]?.[defType] ?? 1;
    }
    const key = String(multiplier);
    if (groups[key]) {
      groups[key].push(attackType);
    } else {
      groups['1'].push(attackType);
    }
  }

  // 비어있지 않은 칸만 생성
  const columns: { label: string; types: PokemonType[]; key: string }[] = [];
  if (groups['4'].length > 0) columns.push({ label: '4배', types: groups['4'], key: '4' });
  if (groups['2'].length > 0) columns.push({ label: '2배', types: groups['2'], key: '2' });
  if (groups['1'].length > 0) columns.push({ label: '1배', types: groups['1'], key: '1' });
  if (groups['0.5'].length > 0) columns.push({ label: '0.5배', types: groups['0.5'], key: '0.5' });
  if (groups['0.25'].length > 0) columns.push({ label: '0.25배', types: groups['0.25'], key: '0.25' });
  if (groups['0'].length > 0) columns.push({ label: '0배', types: groups['0'], key: '0' });

  if (columns.length === 0) {
    return <p className="text-sm text-slate-400">상성 정보가 없습니다.</p>;
  }

  // 칸 크기: 타입 수에 비례 (최소 1, 1배는 항상 넉넉하게)
  const colSizes = columns.map((col) => {
    const count = col.types.length;
    if (count <= 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
  });

  return (
    <div className={`${UI.border} overflow-hidden`}>
      <div
        className="grid"
        style={{ gridTemplateColumns: colSizes.map((s) => `${s}fr`).join(' ') }}
      >
        {/* 헤더 */}
        {columns.map((col, colIdx) => (
          <div
            key={col.key}
            className={`text-center text-xs font-bold py-2 ${UI.tableHeader} text-slate-700 ${
              colIdx < columns.length - 1 ? `border-r ${UI.rowBorder}` : ''
            } border-b ${UI.rowBorder}`}
          >
            {col.label}
          </div>
        ))}
        {/* 본문 */}
        {columns.map((col, colIdx) => {
          const half = Math.ceil(col.types.length / 2);
          const rows = col.types.length > 1
            ? [col.types.slice(0, half), col.types.slice(half)]
            : [col.types];
          return (
            <div
              key={col.key}
              className={`flex flex-col justify-center gap-1.5 py-3 px-2 ${
                colIdx < columns.length - 1 ? `border-r ${UI.rowBorder}` : ''
              }`}
            >
              {rows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex flex-wrap justify-center gap-1.5">
                  {row.map((type) => (
                    <TypeBadge key={type} type={type} size="md" />
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
