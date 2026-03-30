'use client';

import { useState, useRef, useEffect } from 'react';
import type { PartyGrade } from '@/types/pokemon';
import { getGradeColor, getGradeBgColor, getGradeLabel } from '@/lib/party-grade';
import { getGameById } from '@/lib/game-data';
import { Pencil, Check, X } from 'lucide-react';

interface PartyDetailHeaderProps {
  name: string;
  grade?: string;        // 'S' | 'A' | 'B' | 'C' | 'D'
  totalScore?: number;
  gameId: string;
  createdAt: string;
  /** 파티 출처: 'self' = 직접 작성, 'recommend' = 파티 추천 */
  source?: string;
  /** 파티명 변경 콜백 — 제공되면 편집 UI 활성화 */
  onNameChange?: (newName: string) => Promise<void>;
}

export default function PartyDetailHeader({
  name,
  grade,
  totalScore,
  gameId,
  createdAt,
  source,
  onNameChange,
}: PartyDetailHeaderProps) {
  const game = getGameById(gameId);
  const gameName = game ? `${game.label} (${game.generation}세대)` : gameId;

  // 한국어 날짜 포맷: 2026.03.23
  const dateStr = new Date(createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '.').replace(/\.$/, '');

  // 출처 라벨
  const sourceLabel = (() => {
    if (source === 'recommend') {
      return `파티 추천 · ${gameName} · ${dateStr}`;
    }
    if (source === 'self') {
      return `직접 작성 · ${dateStr}`;
    }
    // 기본: 기존 동작 유지 (source가 없는 레거시 데이터)
    return `${gameName} · ${dateStr} 저장`;
  })();

  // 인라인 편집 상태
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleStartEdit = () => {
    setEditValue(name);
    setEditError(null);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditValue(name);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    const trimmed = editValue.trim();
    if (trimmed.length < 1 || trimmed.length > 50) {
      setEditError('1~50자 이내로 입력해주세요.');
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    if (!onNameChange) return;
    try {
      setEditSaving(true);
      setEditError(null);
      await onNameChange(trimmed);
      setEditing(false);
    } catch {
      setEditError('이름 변경에 실패했습니다.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={50}
                  disabled={editSaving}
                  className="flex-1 min-w-0 text-2xl font-bold text-slate-900 px-2 py-1 rounded-lg border border-indigo-300
                    focus:outline-none focus:ring-2 focus:ring-indigo-500
                    disabled:opacity-50"
                />
                <button
                  onClick={handleSaveEdit}
                  disabled={editSaving}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="저장"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={editSaving}
                  className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="취소"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {editError && (
                <p className="mt-1 text-xs text-red-500">{editError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{name}</h1>
              {onNameChange && (
                <button
                  onClick={handleStartEdit}
                  className="p-1 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  aria-label="파티명 편집"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <p className="mt-1 text-sm text-slate-500">
            {sourceLabel}
          </p>
        </div>

        {grade && (
          <div className={`${getGradeBgColor(grade as PartyGrade)} ${getGradeColor(grade as PartyGrade)} px-3 py-2 rounded-xl text-center flex-shrink-0 min-w-[4.5rem]`}>
            <div className="text-2xl font-black leading-none">{grade}</div>
            {totalScore !== undefined && (
              <div className="text-xs opacity-75 mt-1">{totalScore}점 · {getGradeLabel(grade as PartyGrade)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
