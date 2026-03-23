'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UI } from '@/lib/ui-tokens';
import { getSpriteUrl } from '@/lib/sprite';
import TypeBadge from '@/components/TypeBadge';
import type { PokemonType } from '@/types/pokemon';
import { GEN_RANGES } from '@/lib/pokemon-gen';
import { cachedFetch } from '@/lib/client-cache';

interface PokedexEntry {
  id: number;
  name: string;
  types: PokemonType[];
}

interface PokedexListProps {
  pokemon: PokedexEntry[];
  defaultPopularIds: number[];
}

const GEN_LABELS = [
  { gen: 1, label: '1세대', range: '관동', title: '적·녹' },
  { gen: 2, label: '2세대', range: '성도', title: '금·은' },
  { gen: 3, label: '3세대', range: '호연', title: '루비·사파이어' },
  { gen: 4, label: '4세대', range: '신오', title: '다이아·펄' },
  { gen: 5, label: '5세대', range: '하나', title: '블랙·화이트' },
  { gen: 6, label: '6세대', range: '칼로스', title: 'X·Y' },
  { gen: 7, label: '7세대', range: '알로라', title: '썬·문' },
  { gen: 8, label: '8세대', range: '가라르', title: '소드·실드' },
  { gen: 9, label: '9세대', range: '팔데아', title: '스칼렛·바이올렛' },
];

function PokemonCard({ p }: { p: PokedexEntry }) {
  return (
    <Link
      href={`/pokemon/${p.id}`}
      className={`${UI.border} p-3 flex flex-col items-center ${UI.hoverBg} transition-colors`}
    >
      <Image
        src={getSpriteUrl(p.id)}
        alt={p.name}
        width={64}
        height={64}
        className="w-16 h-16 object-contain"

      />
      <span className="text-xs text-slate-400 mt-1">
        #{String(p.id).padStart(3, '0')}
      </span>
      <span className="text-sm font-medium text-slate-900">{p.name}</span>
      <div className="flex gap-1 mt-1">
        {p.types.map((type) => (
          <TypeBadge key={type} type={type} size="sm" />
        ))}
      </div>
    </Link>
  );
}

export default function PokedexList({ pokemon, defaultPopularIds }: PokedexListProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGen, setSelectedGen] = useState<number | null>(null);
  const [popularIds, setPopularIds] = useState<number[]>(defaultPopularIds);
  const searchRef = useRef<HTMLDivElement>(null);

  const pokemonMap = useMemo(() => {
    const map = new Map<number, PokedexEntry>();
    for (const p of pokemon) map.set(p.id, p);
    return map;
  }, [pokemon]);

  // 마운트 시 인기 포켓몬 API 호출 (캐시 적용)
  useEffect(() => {
    cachedFetch('popular-pokemon', async () => {
      const res = await fetch('/api/popular-pokemon?limit=8');
      if (!res.ok) throw new Error(`인기 포켓몬 API 오류: ${res.status}`);
      return res.json();
    })
      .then((data) => {
        if (data.popular?.length > 0) {
          setPopularIds(data.popular.map((p: { pokemonId: number }) => p.pokemonId));
        }
      })
      .catch(() => {/* 폴백 유지 */});
  }, []);

  // 검색 결과 (최대 10개)
  const searchResults = query.trim()
    ? pokemon
        .filter(
          (p) =>
            p.name.includes(query.trim()) ||
            String(p.id).includes(query.trim()) ||
            p.types.some((t) => t.includes(query.trim())),
        )
        .slice(0, 10)
    : [];

  // 인기 포켓몬
  const popularPokemon = popularIds
    .map((id) => pokemonMap.get(id))
    .filter(Boolean) as PokedexEntry[];

  // 세대별 포켓몬
  const genPokemon = selectedGen
    ? pokemon.filter(
        (p) =>
          p.id >= GEN_RANGES[selectedGen - 1][0] &&
          p.id <= GEN_RANGES[selectedGen - 1][1],
      )
    : [];

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="space-y-8">
      {/* 검색 */}
      <div ref={searchRef} className="relative">
        <div className={`${UI.border} overflow-hidden flex items-center`}>
          <span className="pl-3 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => query.trim() && setShowDropdown(true)}
            placeholder="이름, 번호, 타입으로 검색..."
            className="w-full px-3 py-3 text-sm outline-none bg-transparent"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setShowDropdown(false);
              }}
              className="pr-3 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* 드롭다운 결과 */}
        {showDropdown && searchResults.length > 0 && (
          <div className={`absolute left-0 right-0 top-full mt-1 ${UI.border} overflow-hidden bg-white shadow-lg z-50`}>
            {searchResults.map((p, idx) => (
              <Link
                key={p.id}
                href={`/pokemon/${p.id}`}
                className={`flex items-center gap-3 px-3 py-2 ${UI.hoverBg} transition-colors ${
                  idx < searchResults.length - 1 ? `border-b ${UI.innerBorder}` : ''
                }`}
                onClick={() => setShowDropdown(false)}
              >
                <Image
                  src={getSpriteUrl(p.id)}
                  alt={p.name}
                  width={36}
                  height={36}
                  className="w-9 h-9 object-contain"
          
                />
                <span className="text-sm text-slate-400 tabular-nums w-12">
                  #{String(p.id).padStart(3, '0')}
                </span>
                <span className="text-sm font-medium text-slate-900 flex-1">
                  {p.name}
                </span>
                <div className="flex gap-1">
                  {p.types.map((type) => (
                    <TypeBadge key={type} type={type} size="sm" />
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}

        {showDropdown && query.trim() && searchResults.length === 0 && (
          <div className={`absolute left-0 right-0 top-full mt-1 ${UI.border} overflow-hidden bg-white shadow-lg z-50 p-4 text-center text-sm text-slate-400`}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      {/* 인기 포켓몬 */}
      {popularPokemon.length > 0 && !selectedGen && (
        <section>
          <h2 className={UI.sectionTitle}>🔥 인기 포켓몬</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {popularPokemon.map((p) => (
              <PokemonCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* 세대별 둘러보기 */}
      <section>
        <h2 className={UI.sectionTitle}>세대별 둘러보기</h2>
        <div className="grid grid-cols-4 gap-2">
          {GEN_LABELS.map(({ gen, label, range, title }) => (
            <button
              key={gen}
              onClick={() => setSelectedGen(selectedGen === gen ? null : gen)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors cursor-pointer text-center ${
                selectedGen === gen
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold'
                  : `${UI.rowBorder} text-slate-600 ${UI.hoverBg}`
              }`}
            >
              {label} - {title}
              <span className="block text-xs text-slate-400">{range} 지방</span>
            </button>
          ))}
        </div>
      </section>

      {/* 세대 그리드 */}
      {selectedGen && (
        <section>
          <h2 className={UI.sectionTitle}>
            {GEN_LABELS[selectedGen - 1].label} · {GEN_LABELS[selectedGen - 1].range}
            <span className="text-sm font-normal text-slate-400 ml-2">
              {genPokemon.length}마리
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {genPokemon.map((p) => (
              <PokemonCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* SEO: 크롤러용 전체 포켓몬 링크 목록 (세대 미선택 시 표시) */}
      {!selectedGen && (
        <nav aria-label="전체 포켓몬 도감" className="mt-8">
          <h2 className={UI.sectionTitle}>
            전체 도감
            <span className="text-sm font-normal text-slate-400 ml-2">
              {pokemon.length}마리
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pokemon.map((p) => (
              <PokemonCard key={p.id} p={p} />
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
