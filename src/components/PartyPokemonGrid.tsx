'use client';

import { getSpriteUrl } from '@/lib/sprite';
import TypeBadge from '@/components/TypeBadge';
import type { PokemonType } from '@/types/pokemon';
import { UI } from '@/lib/ui-tokens';

interface PokemonDetail {
  id: number;
  name_ko: string;
  types: string[];     // ['불꽃', '비행'] 등
}

interface PartyPokemonGridProps {
  pokemonDetails: PokemonDetail[];
}

/** 6마리 미만일 때 빈 슬롯 포함하여 3x2 그리드로 표시 */
export default function PartyPokemonGrid({ pokemonDetails }: PartyPokemonGridProps) {
  const emptySlots = Math.max(0, 6 - pokemonDetails.length);

  return (
    <div className={`${UI.pageBg} ${UI.border} p-4 mb-6`}>
      <h2 className={UI.sectionTitle}>포켓몬 목록</h2>
      <div className="grid grid-cols-3 gap-3">
        {pokemonDetails.map((pokemon, idx) => (
          <div
            key={`${pokemon.id}-${idx}`}
            className="flex flex-col items-center bg-slate-50 rounded-lg p-3"
          >
            <div className="w-20 h-20 flex items-center justify-center">
              <img
                src={getSpriteUrl(pokemon.id)}
                alt={pokemon.name_ko}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <span className="text-sm font-medium text-slate-800 mt-1">{pokemon.name_ko}</span>
            <div className="flex gap-1 mt-1 flex-wrap justify-center">
              {pokemon.types.map((type) => (
                <TypeBadge key={type} type={type as PokemonType} size="sm" />
              ))}
            </div>
          </div>
        ))}

        {/* 빈 슬롯 */}
        {Array.from({ length: emptySlots }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="flex flex-col items-center justify-center bg-slate-50 rounded-lg p-3 min-h-[120px]"
          >
            <div className={`w-12 h-12 border-2 border-dashed ${UI.rowBorder} rounded-full`} />
            <span className="text-xs text-slate-400 mt-2">빈 슬롯</span>
          </div>
        ))}
      </div>
    </div>
  );
}
