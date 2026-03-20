'use client';

import { Shield, Swords } from 'lucide-react';
import type { StoryPoint } from '@/types/pokemon';
import TypeBadge from './TypeBadge';
import { TYPE_COLORS } from './TypeBadge';

interface StoryPointSelectorProps {
  storyPoints: StoryPoint[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export default function StoryPointSelector({
  storyPoints,
  selectedId,
  onSelect,
}: StoryPointSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {storyPoints.map((point, index) => {
        const isSelected = point.id === selectedId;
        const isGym = point.type === 'gym';
        const typeColor = isGym && point.bossType[0] ? TYPE_COLORS[point.bossType[0]] : '#94a3b8';

        return (
          <button
            key={point.id}
            onClick={() => onSelect(point.id)}
            className={`relative flex flex-col items-center gap-1.5 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
              ${isSelected ? 'shadow-lg scale-105 ring-2 ring-offset-2' : 'shadow-sm hover:shadow-md hover:scale-[1.02]'}`}
            style={isSelected ? { '--tw-ring-color': typeColor } as React.CSSProperties : {}}
          >
            {/* 타입 컬러 헤더 */}
            <div
              className="w-full pt-4 pb-3 flex flex-col items-center gap-1"
              style={{ backgroundColor: isSelected ? typeColor : typeColor + '18' }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm
                  ${isSelected ? 'bg-white/30 text-white' : 'bg-white'}`}
                style={!isSelected ? { color: typeColor } : {}}
              >
                {isGym
                  ? <Shield className="w-5 h-5" />
                  : <Swords className="w-5 h-5" />
                }
              </div>
            </div>

            {/* 정보 영역 */}
            <div className="w-full px-2 pb-3 pt-1 bg-white flex flex-col items-center gap-1">
              <span className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                {point.name}
              </span>
              <span className="text-[11px] text-slate-400">Lv.{point.bossLevel}</span>
              {isGym && point.bossType.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {point.bossType.map((type) => <TypeBadge key={type} type={type} size="sm" />)}
                </div>
              )}
            </div>

            {/* 순서 뱃지 */}
            <div
              className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                backgroundColor: isSelected ? 'rgba(255,255,255,0.4)' : typeColor + '30',
                color: isSelected ? 'white' : typeColor,
              }}
            >
              {index + 1}
            </div>

            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/40 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
