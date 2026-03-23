'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface StatRadarChartProps {
  data: { stat: string; value: number; fullMark: number }[];
}

export default function StatRadarChart({ data }: StatRadarChartProps) {
  return (
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
  );
}
