'use client';

import { Shield } from 'lucide-react';
import type { StoryPoint } from '@/types/pokemon';
import TypeBadge from './TypeBadge';

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
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {storyPoints.map((point) => {
        const isSelected = point.id === selectedId;
        const isGym = point.type === 'gym';

        return (
          <button
            key={point.id}
            onClick={() => onSelect(point.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium
              transition-colors duration-200 cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
              ${
                isSelected
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 ring-offset-2 font-semibold'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
          >
            <div className="flex items-center gap-1.5">
              {isGym && (
                <Shield
                  className={`w-4 h-4 ${
                    isSelected ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'
                  }`}
                />
              )}
              <span>{point.name}</span>
            </div>

            {/* 체육관 타입 표시 */}
            {isGym && point.bossType.length > 0 && !isSelected && (
              <div className="flex gap-0.5 mt-1 justify-center">
                {point.bossType.map((type) => (
                  <TypeBadge key={type} type={type} size="sm" />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
