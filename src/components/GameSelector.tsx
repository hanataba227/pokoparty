'use client';

import {
  getGamesByGeneration,
  isGameEnabled,
  type GenerationGroup,
  type GameEntry,
} from '@/lib/game-data';

const GEN_COLORS: Record<number, { bg: string; text: string; accent: string; ring: string }> = {
  1: { bg: 'bg-red-50', text: 'text-red-700', accent: 'bg-red-500', ring: 'ring-red-400' },
  2: { bg: 'bg-amber-50', text: 'text-amber-700', accent: 'bg-amber-500', ring: 'ring-amber-400' },
  3: { bg: 'bg-emerald-50', text: 'text-emerald-700', accent: 'bg-emerald-500', ring: 'ring-emerald-400' },
  4: { bg: 'bg-sky-50', text: 'text-sky-700', accent: 'bg-sky-500', ring: 'ring-sky-400' },
  5: { bg: 'bg-slate-100', text: 'text-slate-700', accent: 'bg-slate-600', ring: 'ring-slate-400' },
  6: { bg: 'bg-blue-50', text: 'text-blue-700', accent: 'bg-blue-500', ring: 'ring-blue-400' },
  7: { bg: 'bg-orange-50', text: 'text-orange-700', accent: 'bg-orange-500', ring: 'ring-orange-400' },
  8: { bg: 'bg-purple-50', text: 'text-purple-700', accent: 'bg-purple-500', ring: 'ring-purple-400' },
  9: { bg: 'bg-indigo-50', text: 'text-indigo-700', accent: 'bg-indigo-500', ring: 'ring-indigo-400' },
};

interface GameSelectorProps {
  selectedGameId: string | null;
  onSelect: (gameId: string) => void;
  includeDlc?: boolean;
  onDlcToggle?: (value: boolean) => void;
}

export default function GameSelector({
  selectedGameId,
  onSelect,
  includeDlc = false,
  onDlcToggle,
}: GameSelectorProps) {
  const generations = getGamesByGeneration();
  const hasDlcGames = generations.some((g) => g.games.some((game) => game.isDlc));

  return (
    <div className="max-w-5xl mx-auto">
      {/* DLC 토글 */}
      {hasDlcGames && onDlcToggle && (
        <div className="flex justify-end mb-2 px-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-slate-500">DLC 포함</span>
            <button
              type="button"
              role="switch"
              aria-checked={includeDlc}
              onClick={() => onDlcToggle(!includeDlc)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                includeDlc ? 'bg-indigo-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  includeDlc ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {generations.map((group) => (
          <GenerationCard
            key={group.generation}
            group={group}
            selectedGameId={selectedGameId}
            onSelect={onSelect}
            includeDlc={includeDlc}
          />
        ))}
      </div>
    </div>
  );
}

function GenerationCard({
  group,
  selectedGameId,
  onSelect,
  includeDlc,
}: {
  group: GenerationGroup;
  selectedGameId: string | null;
  onSelect: (gameId: string) => void;
  includeDlc: boolean;
}) {
  const c = GEN_COLORS[group.generation] ?? GEN_COLORS[1];
  const games = includeDlc ? group.games : group.games.filter((g) => !g.isDlc);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* 컬러 헤더 */}
      <div className={`${c.bg} px-3 py-2 flex items-center gap-2 border-b border-slate-100`}>
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${c.accent} text-white text-[10px] font-bold`}>
          {group.generation}
        </span>
        <span className={`text-xs font-bold ${c.text}`}>{group.label}</span>
        <span className="text-[10px] text-slate-400">{group.region}</span>
      </div>

      {/* 게임 리스트 */}
      <div className="p-2 space-y-1">
        {games.map((game) => {
          const enabled = isGameEnabled(game);
          const isSelected = selectedGameId === game.id;
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => enabled && onSelect(game.id)}
              disabled={!enabled}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left
                ${!enabled
                  ? 'opacity-25 cursor-not-allowed'
                  : isSelected
                    ? `${c.bg} ring-2 ${c.ring}`
                    : 'hover:bg-slate-50 cursor-pointer'
                }`}
            >
              <span className="text-sm leading-none">{game.icon}</span>
              <span className={`text-xs font-semibold flex-1 ${isSelected ? c.text : 'text-slate-700'}`}>
                {game.label}
              </span>
              {game.isDlc && <span className="text-[8px] text-indigo-400 font-medium">DLC</span>}
              {game.isRemake && !game.isDlc && <span className="text-[8px] text-slate-400">리메이크</span>}
              {isSelected && (
                <svg className={`w-3 h-3 ${c.text} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
