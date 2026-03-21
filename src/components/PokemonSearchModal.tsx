'use client';

import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import type { Pokemon, PokemonType } from '@/types/pokemon';
import { ALL_TYPES } from '@/lib/type-calc';
import PokemonCard from './PokemonCard';
import { TYPE_COLORS } from './TypeBadge';
import { UI } from '@/lib/ui-tokens';

interface PokemonSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pokemon: Pokemon) => void;
  availablePokemon: Pokemon[];
}

export default function PokemonSearchModal({
  isOpen,
  onClose,
  onSelect,
  availablePokemon,
}: PokemonSearchModalProps) {
  const [searchName, setSearchName] = useState('');
  const [selectedType, setSelectedType] = useState<PokemonType | null>(null);

  const filteredPokemon = useMemo(() => {
    return availablePokemon.filter((p) => {
      const matchesName = searchName === '' || p.name.includes(searchName);
      const matchesType = selectedType === null || p.types.includes(selectedType);
      return matchesName && matchesType;
    });
  }, [availablePokemon, searchName, selectedType]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className={`flex items-center justify-between p-6 pb-4 border-b ${UI.rowBorder}`}>
          <h2 className="text-xl font-bold text-slate-900">
            포켓몬 선택
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 검색 필터 */}
        <div className="px-6 py-4 space-y-3 border-b border-slate-100">
          {/* 이름 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="포켓몬 이름 검색..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg
                border ${UI.rowBorder} ${UI.pageBg}
                text-slate-900
                placeholder:text-slate-400
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none
                transition-colors duration-200 text-base`}
            />
          </div>

          {/* 타입 필터 */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                ${
                  selectedType === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              전체
            </button>
            {ALL_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? null : type)}
                className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors duration-200 cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                  ${
                    selectedType === type
                      ? 'text-white ring-2 ring-offset-1 ring-white/50'
                      : 'text-white opacity-70 hover:opacity-100'
                  }`}
                style={{ backgroundColor: TYPE_COLORS[type] }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 포켓몬 그리드 */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredPokemon.length === 0 ? (
            <p className="text-center text-slate-400 py-8">
              검색 결과가 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredPokemon.map((pokemon) => (
                <PokemonCard
                  key={pokemon.id}
                  pokemon={pokemon}
                  onClick={() => {
                    onSelect(pokemon);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 하단 정보 */}
        <div className="px-6 py-3 border-t border-slate-100 text-center">
          <span className="text-slate-400 text-sm">
            {filteredPokemon.length}마리 표시 중
          </span>
        </div>
      </div>
    </div>
  );
}
