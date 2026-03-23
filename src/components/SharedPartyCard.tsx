'use client';

import { useRouter } from 'next/navigation';
import type { SharedParty } from '@/types/shared-party';
import type { PartyGrade } from '@/types/pokemon';
import { getSpriteUrl } from '@/lib/sprite';
import { UI } from '@/lib/ui-tokens';
import { getGradeColor, getGradeBgColor } from '@/lib/party-grade';
import { getGameById } from '@/lib/game-data';

interface SharedPartyCardProps {
  party: SharedParty;
}

/** 상대 시간 표시 (예: "3일 전", "방금 전") */
function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 30) return `${diffDay}일 전`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}개월 전`;
  return `${Math.floor(diffDay / 365)}년 전`;
}

export default function SharedPartyCard({ party }: SharedPartyCardProps) {
  const router = useRouter();

  const game = getGameById(party.game_id);
  const gameName = game ? game.label : party.game_id;
  const grade = party.grade as PartyGrade;
  const relativeTime = getRelativeTime(party.shared_at);

  const handleClick = () => {
    router.push(`/community/${party.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`${UI.pageBg} ${UI.border} p-4 hover:border-indigo-300 hover:shadow-sm transition-all duration-200 cursor-pointer`}
    >
      {/* 상단: 닉네임 · 게임 · 시간 */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
        <span className="font-medium text-slate-700">{party.display_name}</span>
        <span aria-hidden="true">·</span>
        <span>{gameName}</span>
        <span aria-hidden="true">·</span>
        <span>{relativeTime}</span>
      </div>

      {/* 포켓몬 6마리 가로 배치 */}
      <div className="flex gap-1 mb-3">
        {party.pokemon_ids.map((id, idx) => (
          <div
            key={`${id}-${idx}`}
            className="flex-1 aspect-square bg-slate-50 rounded-lg flex items-center justify-center min-w-0"
          >
            <img
              src={getSpriteUrl(id)}
              alt={`Pokemon #${id}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        ))}
        {/* 6마리 미만일 때 빈 슬롯 */}
        {Array.from({ length: Math.max(0, 6 - party.pokemon_ids.length) }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="flex-1 aspect-square bg-slate-50 rounded-lg flex items-center justify-center min-w-0"
          >
            <div className={`w-6 h-6 border-2 border-dashed ${UI.rowBorder} rounded-full`} />
          </div>
        ))}
      </div>

      {/* 메모 미리보기 (1줄) */}
      {party.memo && (
        <p className="text-sm text-slate-600 truncate mb-3 leading-relaxed">
          &ldquo;{party.memo}&rdquo;
        </p>
      )}

      {/* 하단: 등급 + 점수 */}
      <div className="flex items-center justify-end">
        <span className={`${getGradeBgColor(grade)} ${getGradeColor(grade)} px-2 py-1 rounded-lg text-sm font-bold`}>
          {grade}등급 {Math.round(party.total_score)}점
        </span>
      </div>
    </div>
  );
}
