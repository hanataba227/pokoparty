'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import type { Pokemon, SavedParty, CompareResponse } from '@/types/pokemon';
import { getClientErrorMessage } from '@/lib/error-utils';
import PartySlot from '@/components/PartySlot';
import PokemonSearchModal from '@/components/PokemonSearchModal';
import CompareResultTable from '@/components/CompareResultTable';
import CompareDetailPanel from '@/components/CompareDetailPanel';
import CompareHighlights from '@/components/CompareHighlights';
import { Loader2, Swords, FolderOpen } from 'lucide-react';
import { UI } from '@/lib/ui-tokens';
import { cachedFetch } from '@/lib/client-cache';
import { useAuth } from '@/contexts/AuthContext';

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className={`min-h-screen ${UI.pageBg} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const { user } = useAuth();

  const [partyA, setPartyA] = useState<(Pokemon | null)[]>([null, null, null, null, null, null]);
  const [partyB, setPartyB] = useState<(Pokemon | null)[]>([null, null, null, null, null, null]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');

  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [pokemonLoading, setPokemonLoading] = useState(true);
  const [pokemonError, setPokemonError] = useState<string | null>(null);

  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedParties, setSavedParties] = useState<SavedParty[]>([]);
  const [partyListOpenA, setPartyListOpenA] = useState(false);
  const [partyListOpenB, setPartyListOpenB] = useState(false);
  const [partyLoading, setPartyLoading] = useState(false);
  const [partyLoadError, setPartyLoadError] = useState<string | null>(null);

  const partyListRefA = useRef<HTMLDivElement>(null);
  const partyListRefB = useRef<HTMLDivElement>(null);

  const pokemonMap = useMemo(() => {
    const map = new Map<number, Pokemon>();
    for (const p of allPokemon) map.set(p.id, p);
    return map;
  }, [allPokemon]);

  useEffect(() => {
    async function fetchPokemon() {
      try {
        setPokemonLoading(true);
        const data = await cachedFetch('pokemon-list-all', async () => {
          const res = await fetch('/api/pokemon');
          if (!res.ok) throw new Error('포켓몬 목록을 불러올 수 없습니다.');
          return res.json();
        });
        setAllPokemon(data.pokemon);
      } catch (err) {
        setPokemonError(getClientErrorMessage(err));
      } finally {
        setPokemonLoading(false);
      }
    }
    fetchPokemon();
  }, []);

  useEffect(() => {
    if (!partyListOpenA) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (partyListRefA.current && !partyListRefA.current.contains(e.target as Node)) {
        setPartyListOpenA(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [partyListOpenA]);

  useEffect(() => {
    if (!partyListOpenB) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (partyListRefB.current && !partyListRefB.current.contains(e.target as Node)) {
        setPartyListOpenB(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [partyListOpenB]);

  const handleSlotClick = (side: 'A' | 'B', index: number) => {
    setActiveSide(side);
    setActiveSlot(index);
    setModalOpen(true);
  };

  const handleSelect = (pokemon: Pokemon) => {
    const setter = activeSide === 'A' ? setPartyA : setPartyB;
    setter((prev) => {
      const next = [...prev];
      next[activeSlot] = pokemon;
      return next;
    });
    setCompareResult(null);
    setError(null);
  };

  const handleRemove = (side: 'A' | 'B', index: number) => {
    const setter = side === 'A' ? setPartyA : setPartyB;
    setter((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setCompareResult(null);
    setError(null);
  };

  const handleLoadMyParties = useCallback(async (side: 'A' | 'B') => {
    const isOpen = side === 'A' ? partyListOpenA : partyListOpenB;
    const setOpen = side === 'A' ? setPartyListOpenA : setPartyListOpenB;
    const otherSetOpen = side === 'A' ? setPartyListOpenB : setPartyListOpenA;

    if (isOpen) {
      setOpen(false);
      return;
    }
    try {
      setPartyLoading(true);
      setPartyLoadError(null);
      otherSetOpen(false);
      const res = await fetch('/api/parties?limit=30');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '파티 목록을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setSavedParties(data.parties ?? []);
      setOpen(true);
    } catch (err) {
      setPartyLoadError(getClientErrorMessage(err));
    } finally {
      setPartyLoading(false);
    }
  }, [partyListOpenA, partyListOpenB]);

  const handleSelectSavedParty = useCallback((savedParty: SavedParty, side: 'A' | 'B') => {
    const newParty: (Pokemon | null)[] = [null, null, null, null, null, null];
    savedParty.pokemon_ids.slice(0, 6).forEach((id, i) => {
      const found = pokemonMap.get(id);
      if (found) newParty[i] = found;
    });
    if (side === 'A') {
      setPartyA(newParty);
      setPartyListOpenA(false);
    } else {
      setPartyB(newParty);
      setPartyListOpenB(false);
    }
    setCompareResult(null);
    setError(null);
  }, [pokemonMap]);

  const selectedCountA = partyA.filter((p) => p !== null).length;
  const selectedCountB = partyB.filter((p) => p !== null).length;
  const canCompare = selectedCountA >= 1 && selectedCountB >= 1;

  const handleCompare = useCallback(async () => {
    const idsA = partyA.filter((p): p is Pokemon => p !== null).map((p) => String(p.id));
    const idsB = partyB.filter((p): p is Pokemon => p !== null).map((p) => String(p.id));
    if (idsA.length === 0 || idsB.length === 0) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyA: idsA, partyB: idsB }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '비교에 실패했습니다.');
      }
      const data: CompareResponse = await res.json();
      setCompareResult(data);
    } catch (err) {
      setError(getClientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [partyA, partyB]);

  const renderSavedPartyDropdown = (side: 'A' | 'B') => {
    const isOpen = side === 'A' ? partyListOpenA : partyListOpenB;
    const ref = side === 'A' ? partyListRefA : partyListRefB;

    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => handleLoadMyParties(side)}
          disabled={partyLoading || pokemonLoading}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl
            border-2 font-medium text-sm
            ${isOpen
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : `${UI.border} text-slate-600 hover:border-indigo-300 hover:text-indigo-600`
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
        >
          {partyLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FolderOpen className="w-4 h-4" />
          )}
          내 파티
        </button>

        {partyLoadError && (
          <p className="absolute right-0 mt-1 text-xs text-red-500 whitespace-nowrap">{partyLoadError}</p>
        )}

        {isOpen && (
          <div className={`absolute right-0 mt-2 w-max min-w-72 rounded-xl border ${UI.rowBorder} bg-white shadow-lg overflow-hidden z-10`}>
            {savedParties.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                저장된 파티가 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {savedParties.map((sp) => (
                  <li key={sp.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectSavedParty(sp, side)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-slate-800">
                          {sp.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {sp.pokemon_ids.length}마리
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 whitespace-nowrap">
                        {sp.pokemon_names
                          ? sp.pokemon_names.slice(0, 6).join(', ')
                          : sp.pokemon_ids.slice(0, 6).map((id) => pokemonMap.get(id)?.name ?? `#${id}`).join(', ')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPartySection = (side: 'A' | 'B') => {
    const party = side === 'A' ? partyA : partyB;
    const label = side === 'A' ? '파티 A' : '파티 B';

    return (
      <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
          {user && renderSavedPartyDropdown(side)}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {party.map((pokemon, index) => (
            <PartySlot
              key={index}
              slotNumber={index + 1}
              pokemon={pokemon ?? undefined}
              onAdd={() => handleSlotClick(side, index)}
              onRemove={pokemon ? () => handleRemove(side, index) : undefined}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${UI.pageBg}`}>
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            파티 비교
          </h1>
          <p className="mt-2 text-slate-500">
            두 파티를 비교하여 강점과 약점을 분석해보세요.
          </p>
        </div>

        {pokemonError && (
          <div className="mb-8 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {pokemonError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {renderPartySection('A')}
          {renderPartySection('B')}
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={handleCompare}
            disabled={!canCompare || loading || pokemonLoading}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl
              bg-indigo-600 text-white font-semibold text-base
              hover:bg-indigo-700 active:bg-indigo-800
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200 cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                비교 중...
              </>
            ) : (
              <>
                <Swords className="w-5 h-5" />
                비교하기
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            {error}
          </div>
        )}

        {compareResult && (
          <div className="space-y-6">
            <CompareResultTable result={compareResult} />
            <CompareDetailPanel result={compareResult} />
            {compareResult.comparison.highlights.length > 0 && (
              <CompareHighlights highlights={compareResult.comparison.highlights} />
            )}
          </div>
        )}

        <PokemonSearchModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={handleSelect}
          availablePokemon={allPokemon}
        />
      </div>
    </div>
  );
}
