'use client';

import type { BaseStats } from '@/types/pokemon';
import { UI } from '@/lib/ui-tokens';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface StatBarProps {
  stats: BaseStats;
}

const STAT_CONFIG: { key: keyof BaseStats; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: '공격' },
  { key: 'def', label: '방어' },
  { key: 'spe', label: '스피드' },
  { key: 'spd', label: '특방' },
  { key: 'spa', label: '특공' },
];

export default function StatBar({ stats }: StatBarProps) {
  const total = stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;

  const data = STAT_CONFIG.map(({ key, label }) => ({
    stat: label,
    value: stats[key],
    fullMark: 200,
  }));

  return (
    <div className={`${UI.border} overflow-hidden h-full flex flex-col`}>
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="w-full aspect-square max-w-[280px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="stat"
              tick={{ fontSize: 13, fill: '#64748b' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 200]}
              tick={false}
              axisLine={false}
            />
            <Radar
              dataKey="value"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* 수치 요약 */}
      <div className={`border-t ${UI.rowBorder}`}>
        <div className="grid grid-cols-3">
          {STAT_CONFIG.map(({ key, label }, idx) => (
            <div
              key={key}
              className={`text-sm text-center py-1.5 ${
                idx % 3 !== 2 ? `border-r ${UI.rowBorder}` : ''
              } ${idx < 3 ? `border-b ${UI.rowBorder}` : ''}`}
            >
              <span className="text-slate-400">{label} </span>
              <span className="font-bold text-slate-900">{stats[key]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={`border-t ${UI.rowBorder} text-center py-2 ${UI.footerBg} text-base`}>
        <span className="text-slate-400">합계 </span>
        <span className="font-bold text-slate-900">{total}</span>
      </div>
    </div>
  );
}
