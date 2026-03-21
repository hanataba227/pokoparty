'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface RadarDataItem {
  type: string;
  value: number;
}

interface RechartsRadarProps {
  data: RadarDataItem[];
}

export default function RechartsRadar({ data }: RechartsRadarProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#94a3b8" />
        <PolarAngleAxis
          dataKey="type"
          tick={{ fill: '#64748b', fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 4]}
          tick={{ fill: '#94a3b8', fontSize: 10 }}
        />
        {/* 내성 영역 (1.0 미만) — 파란색 */}
        <Radar
          name="매치업"
          dataKey="value"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#f1f5f9',
            fontSize: '0.875rem',
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => {
            const num = Number(value ?? 1);
            const label = num > 1 ? '약점' : num < 1 ? '내성' : '보통';
            return [`${num.toFixed(2)}x (${label})`, '배율'];
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
