'use client';

import type { PartyGrade } from '@/types/pokemon';
import { getGradeColor, getGradeBgColor, getGradeLabel } from '@/lib/party-grade';
import { getGameById } from '@/lib/game-data';

interface PartyDetailHeaderProps {
  name: string;
  grade?: string;        // 'S' | 'A' | 'B' | 'C' | 'D'
  totalScore?: number;
  gameId: string;
  createdAt: string;
}

export default function PartyDetailHeader({ name, grade, totalScore, gameId, createdAt }: PartyDetailHeaderProps) {
  const game = getGameById(gameId);
  const gameName = game ? `${game.label} (${game.generation}세대)` : gameId;

  // 한국어 날짜 포맷: 2026.03.23
  const dateStr = new Date(createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '.').replace(/\.$/, '');

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {gameName} · {dateStr} 저장
          </p>
        </div>

        {grade && (
          <div className={`${getGradeBgColor(grade as PartyGrade)} ${getGradeColor(grade as PartyGrade)} px-3 py-2 rounded-xl text-center flex-shrink-0`}>
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
