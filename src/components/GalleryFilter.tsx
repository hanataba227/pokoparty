'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import GameSelect from '@/components/GameSelect';

export type SortOption = 'recent' | 'likes' | 'saves' | 'score';
export type GradeFilter = '' | 'S' | 'A' | 'B' | 'C' | 'D';

interface GalleryFilterProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  search: string;
  onSearchChange: (q: string) => void;
  grade: GradeFilter;
  onGradeChange: (grade: GradeFilter) => void;
  gameId: string;
  onGameChange: (gameId: string) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: '최신순' },
  { value: 'likes', label: '좋아요순' },
  { value: 'saves', label: '저장순' },
  { value: 'score', label: '점수순' },
];

const GRADE_OPTIONS: { value: GradeFilter; label: string }[] = [
  { value: '', label: '전체 등급' },
  { value: 'S', label: 'S등급' },
  { value: 'A', label: 'A등급' },
  { value: 'B', label: 'B등급' },
  { value: 'C', label: 'C등급' },
  { value: 'D', label: 'D등급' },
];

export default function GalleryFilter({
  sort,
  onSortChange,
  search,
  onSearchChange,
  grade,
  onGradeChange,
  gameId,
  onGameChange,
}: GalleryFilterProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 디바운스 검색
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localSearch, onSearchChange]);

  // 외부에서 search가 변경되면 (초기화 등) localSearch도 동기화
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const hasActiveFilter = search || grade || gameId || sort !== 'recent';

  const handleReset = useCallback(() => {
    setLocalSearch('');
    onSearchChange('');
    onGradeChange('');
    onGameChange('');
    onSortChange('recent');
  }, [onSearchChange, onGradeChange, onGameChange, onSortChange]);

  return (
    <div className="mb-6 space-y-3">
      {/* 1행: 검색 + 등급 + 게임 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 파티명 검색 */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="파티명 검색..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-300 bg-white
              placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              transition-colors"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 등급 필터 */}
        <select
          value={grade}
          onChange={(e) => onGradeChange(e.target.value as GradeFilter)}
          className="appearance-none px-3 pr-7 py-2 text-sm rounded-lg border border-slate-300 bg-white
            bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
            bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            transition-colors cursor-pointer"
        >
          {GRADE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* 게임 필터 */}
        <div className="min-w-0 sm:w-40">
          <GameSelect
            value={gameId}
            onChange={onGameChange}
            className="!py-2 !rounded-lg"
          />
        </div>
      </div>

      {/* 2행: 정렬 + 초기화 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">정렬:</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {hasActiveFilter && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
}
