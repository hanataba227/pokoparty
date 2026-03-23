'use client';

import { getGamesByGeneration, isGameEnabled, type GameEntry } from '@/lib/game-data';

interface GameSelectProps {
  value: string;
  onChange: (gameId: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function GameSelect({ value, onChange, disabled, className }: GameSelectProps) {
  const generations = getGamesByGeneration();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full appearance-none px-3 pr-7 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800
        bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
        bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200 cursor-pointer
        ${className ?? ''}`}
    >
      <option value="">타이틀 선택하기</option>
      {generations.map((gen) => (
        <optgroup key={gen.generation} label={`${gen.label} — ${gen.region}`}>
          {gen.games
            .filter((g) => !g.hidden && !g.isDlc && isGameEnabled(g))
            .map((game) => (
              <option key={game.id} value={game.id}>
                {game.label} ({game.generation}세대)
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
