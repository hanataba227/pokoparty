'use client';

import { useState, useCallback } from 'react';
import PokemonCard from '@/components/PokemonCard';
import GameSelector from '@/components/GameSelector';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { UI } from '@/lib/ui-tokens';
import type { Pokemon, ScoringBreakdown, DetailedReason } from '@/types/pokemon';
import { getClientErrorMessage } from '@/lib/error-utils';

interface RecommendationItem {
  pokemon: Pokemon;
  score: number;
  reasons: string[];
  role: string;
  breakdown: ScoringBreakdown;
  detailedReasons?: DetailedReason[];
}

export default function RecommendPreviewPage() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [parties, setParties] = useState<RecommendationItem[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePartyIndex, setActivePartyIndex] = useState(0);

  const fetchParties = useCallback(async () => {
    if (!selectedGameId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixedPokemon: [],
          slotsToFill: 6,
          partyCount: 3,
          filters: {
            excludeTradeEvolution: true,
            excludeItemEvolution: true,
            includeStarters: false,
            finalOnly: false,
            gen8Only: false,
            gameVersion: selectedGameId,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '추천을 가져오지 못했습니다.');
      }
      const data = await res.json();
      setParties(data.parties || []);
      setActivePartyIndex(0);
    } catch (err) {
      setError(getClientErrorMessage(err, '알 수 없는 오류가 발생했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [selectedGameId]);

  const hasResults = parties.length > 0;

  return (
    <div className={`min-h-screen ${UI.pageBg}`}>
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            파티 추천 미리보기
          </h1>
          <p className="mt-2 text-slate-500">
            두 가지 UI 모드를 비교해보세요.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            상위 5개 후보 중 가중 랜덤 선택 / 포켓몬당 최대 2회 등장
          </p>
        </div>

        {/* 게임 선택 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-3">게임 선택</h2>
          <GameSelector
            selectedGameId={selectedGameId}
            onSelect={(id) => setSelectedGameId(id === selectedGameId ? null : id)}
          />
        </div>

        {/* 추천 버튼 */}
        <div className="text-center mb-10">
          <button
            onClick={fetchParties}
            disabled={!selectedGameId || loading}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl
              bg-indigo-600 text-white font-semibold text-base
              hover:bg-indigo-700 active:bg-indigo-800
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-200 cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                계산 중...
              </>
            ) : (
              <>
                <Layers className="w-5 h-5" />
                3개 파티 추천받기
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-8">
            {error}
          </div>
        )}

        {hasResults && !loading && (
          <div className="space-y-16">
            {/* ===== 모드 A: 1개 파티 + 다른 조합 버튼 ===== */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                  A
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    1개 파티 + 다른 조합 보기
                  </h2>
                  <p className="text-sm text-slate-500">
                    현재 UI와 비슷한 형태. 버튼으로 파티를 전환합니다.
                  </p>
                </div>
              </div>

              <div className={`${UI.border} p-6`}>
                {/* 파티 인디케이터 + 네비게이션 */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    {parties.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePartyIndex(idx)}
                        className={`w-9 h-9 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer
                          ${activePartyIndex === idx
                            ? 'bg-indigo-600 text-white shadow-md scale-110'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivePartyIndex((i) => Math.max(0, i - 1))}
                      disabled={activePartyIndex === 0}
                      className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <button
                      onClick={() => setActivePartyIndex((i) => Math.min(parties.length - 1, i + 1))}
                      disabled={activePartyIndex === parties.length - 1}
                      className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>
                </div>

                {/* 파티 카드 그리드 */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {parties[activePartyIndex]?.map((rec) => (
                    <PokemonCard
                      key={rec.pokemon.id}
                      pokemon={rec.pokemon}
                      score={rec.breakdown}
                      detailedReasons={rec.detailedReasons}
                    />
                  ))}
                </div>

                {/* 다른 조합 버튼 */}
                <div className="mt-5 text-center">
                  <button
                    onClick={fetchParties}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                      border-2 border-indigo-200 text-indigo-600 font-semibold text-sm
                      hover:bg-indigo-50 hover:border-indigo-300
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    다른 조합 보기
                  </button>
                </div>
              </div>
            </section>

            {/* ===== 모드 B: 3개 파티 한눈에 ===== */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                  B
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    3개 파티 한눈에 비교
                  </h2>
                  <p className="text-sm text-slate-500">
                    3개 파티를 동시에 보여줍니다.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {parties.map((party, partyIdx) => (
                  <div key={partyIdx} className={`${UI.border} p-5`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                        ${partyIdx === 0 ? 'bg-amber-100 text-amber-700' : partyIdx === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>
                        {partyIdx + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        파티 {partyIdx + 1}
                      </span>
                      <span className="text-xs text-slate-400">
                        평균 점수 {Math.round(party.reduce((s, r) => s + r.score, 0) / party.length)}점
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {party.map((rec) => (
                        <PokemonCard
                          key={rec.pokemon.id}
                          pokemon={rec.pokemon}
                          score={rec.breakdown}
                          detailedReasons={rec.detailedReasons}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 다른 조합 버튼 */}
              <div className="mt-5 text-center">
                <button
                  onClick={fetchParties}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                    border-2 border-emerald-200 text-emerald-600 font-semibold text-sm
                    hover:bg-emerald-50 hover:border-emerald-300
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-200 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  전부 새로 추천받기
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
