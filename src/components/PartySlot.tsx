'use client';

import Image from 'next/image';
import { Plus, X } from 'lucide-react';
import type { Pokemon } from '@/types/pokemon';
import TypeBadge from './TypeBadge';

interface PartySlotProps {
  pokemon?: Pokemon;
  slotNumber: number;
  onRemove?: () => void;
  onAdd?: () => void;
}

export default function PartySlot({ pokemon, slotNumber, onRemove, onAdd }: PartySlotProps) {
  if (!pokemon) {
    return (
      <div
        onClick={onAdd}
        className={`w-24 h-24 rounded-xl border-2 border-dashed border-slate-300
          flex flex-col items-center justify-center gap-1
          hover:border-indigo-400 hover:bg-indigo-50
          transition-colors duration-200
          ${onAdd ? 'cursor-pointer' : ''}
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onAdd?.();
          }
        }}
        aria-label={`슬롯 ${slotNumber}: 포켓몬 추가`}
      >
        <Plus className="w-8 h-8 text-slate-300" />
        <span className="text-[10px] text-slate-400">포켓몬 추가</span>
      </div>
    );
  }

  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;

  return (
    <div
      className="relative w-24 h-24 rounded-xl border-2 border-indigo-500 bg-indigo-50
        flex flex-col items-center justify-center p-2
        transition-all duration-200"
    >
      {/* 제거 버튼 */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white
            rounded-full flex items-center justify-center cursor-pointer
            hover:bg-red-600 transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          aria-label={`${pokemon.name} 제거`}
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* 포켓몬 이미지 */}
      <Image
        src={spriteUrl}
        alt={pokemon.name}
        width={48}
        height={48}
        className="w-12 h-12 object-contain"
        unoptimized
      />

      {/* 이름 */}
      <span className="text-xs font-medium text-slate-700 mt-0.5 truncate max-w-full">
        {pokemon.name}
      </span>

      {/* 타입 뱃지 (작게) */}
      <div className="flex gap-0.5 mt-0.5">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} size="sm" />
        ))}
      </div>
    </div>
  );
}
