'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import type { SavedParty, GradeInfo } from '@/types/pokemon';
import { getSpriteUrl } from '@/lib/sprite';
import { UI } from '@/lib/ui-tokens';
import { getGradeColor, getGradeBgColor } from '@/lib/party-grade';
import { getGameById } from '@/lib/game-data';

interface SavedPartyCardProps {
  party: SavedParty;
  gradeInfo?: GradeInfo | null;
  onDelete: (id: string) => Promise<void>;
}

export default function SavedPartyCard({ party, gradeInfo, onDelete }: SavedPartyCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(party.id);
    } catch {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleCardClick = () => {
    if (showConfirm) return; // 삭제 확인 중에는 네비게이션 방지
    router.push(`/party/${party.id}`);
  };

  const dateStr = new Date(party.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      onClick={handleCardClick}
      className={`${UI.pageBg} ${UI.border} p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-slate-800 truncate flex-1 mr-2">{party.name}</h3>
        {gradeInfo && (
          <div className={`${getGradeBgColor(gradeInfo.grade)} ${getGradeColor(gradeInfo.grade)} px-2 py-1 rounded-lg text-center flex-shrink-0`}>
            <div className="text-lg font-bold leading-none">{gradeInfo.grade}</div>
            <div className="text-[10px] opacity-75">{gradeInfo.totalScore}점</div>
          </div>
        )}
      </div>

      {/* Pokemon Sprites 3x2 Grid */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        {party.pokemon_ids.map((id, idx) => (
          <div
            key={`${id}-${idx}`}
            className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center"
          >
            <img
              src={getSpriteUrl(id)}
              alt={`Pokemon #${id}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        ))}
        {/* Fill empty slots for parties with < 6 pokemon */}
        {Array.from({ length: Math.max(0, 6 - party.pokemon_ids.length) }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center"
          >
            <div className={`w-6 h-6 border-2 border-dashed ${UI.rowBorder} rounded-full`} />
          </div>
        ))}
      </div>

      {/* Game info + date */}
      <div className="flex items-center justify-between mb-3">
        {party.game_id && (
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {(() => {
              const game = getGameById(party.game_id);
              return game ? `${game.label}(${game.generation}세대)` : party.game_id;
            })()}
          </span>
        )}
        <span className="text-xs text-slate-400">{dateStr}</span>
      </div>

      {/* Action Buttons — 삭제만 유지, 분석 버튼 제거 (상세 페이지 내 분석으로 대체) */}
      {showConfirm ? (
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-1.5 px-3 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {deleting ? '삭제 중...' : '삭제 확인'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
            disabled={deleting}
            className={`flex-1 py-1.5 px-3 text-sm font-medium ${UI.border} text-slate-600 ${UI.hoverBg} transition-colors cursor-pointer`}
          >
            취소
          </button>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
