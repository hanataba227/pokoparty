'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Pokemon, AnalysisResult, GradeInfo, PartyGrade, SavedParty } from '@/types/pokemon';
import { ALL_TYPES } from '@/lib/type-calc';
import { getGradeColor, getGradeLabel, getGradeBgColor } from '@/lib/party-grade';
import { getClientErrorMessage } from '@/lib/error-utils';
import PartySlot from '@/components/PartySlot';
import PokemonSearchModal from '@/components/PokemonSearchModal';
import TypeBadge from '@/components/TypeBadge';
import { Loader2, BarChart3, Shield, Swords, AlertTriangle, FolderOpen, Lightbulb } from 'lucide-react';
import { UI } from '@/lib/ui-tokens';
import { cachedFetch } from '@/lib/client-cache';
import { useAuth } from '@/contexts/AuthContext';

/** 종합 점수 등급 색상 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return '우수';
  if (score >= 60) return '양호';
  if (score >= 40) return '보통';
  return '부족';
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className={`min-h-screen ${UI.pageBg} flex items-center justify-center`}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [party, setParty] = useState<(Pokemon | null)[]>([null, null, null, null, null, null]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number>(0);

  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [pokemonLoading, setPokemonLoading] = useState(true);
  const [pokemonError, setPokemonError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [savedParties, setSavedParties] = useState<SavedParty[]>([]);
  const [partyListOpen, setPartyListOpen] = useState(false);
  const [partyLoading, setPartyLoading] = useState(false);
  const [partyLoadError, setPartyLoadError] = useState<string | null>(null);

  const autoAnalyzeDone = useRef(false);
  const partyListRef = useRef<HTMLDivElement>(null);

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

  const [shouldAutoAnalyze, setShouldAutoAnalyze] = useState(false);

  useEffect(() => {
    if (autoAnalyzeDone.current || allPokemon.length === 0) return;
    const idsParam = searchParams.get('pokemon_ids');
    if (!idsParam) return;
    const ids = idsParam.split(',').map(Number).filter((id) => !isNaN(id) && id > 0);
    if (ids.length === 0) return;
    const newParty: (Pokemon | null)[] = [null, null, null, null, null, null];
    ids.slice(0, 6).forEach((id, i) => {
      const found = pokemonMap.get(id);
      if (found) newParty[i] = found;
    });
    setParty(newParty);
    setShouldAutoAnalyze(true);
    autoAnalyzeDone.current = true;
  }, [allPokemon, pokemonMap, searchParams]);

  // 드롭다운 외부 클릭 닫기 (#49)
  useEffect(() => {
    if (!partyListOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (partyListRef.current && !partyListRef.current.contains(e.target as Node)) {
        setPartyListOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [partyListOpen]);

  const handleSlotClick = (index: number) => {
    setActiveSlot(index);
    setModalOpen(true);
  };

  const handleSelect = (pokemon: Pokemon) => {
    setParty((prev) => {
      const next = [...prev];
      next[activeSlot] = pokemon;
      return next;
    });
    setAnalysis(null);
    setAnalyzeError(null);
  };

  const handleRemove = (index: number) => {
    setParty((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setAnalysis(null);
    setAnalyzeError(null);
  };

  const handleLoadMyParties = useCallback(async () => {
    if (partyListOpen) {
      setPartyListOpen(false);
      return;
    }
    try {
      setPartyLoading(true);
      setPartyLoadError(null);
      const res = await fetch('/api/parties?limit=30');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '파티 목록을 불러올 수 없습니다.');
      }
      const data = await res.json();
      setSavedParties(data.parties ?? []);
      setPartyListOpen(true);
    } catch (err) {
      setPartyLoadError(getClientErrorMessage(err));
    } finally {
      setPartyLoading(false);
    }
  }, [partyListOpen]);

  const handleSelectSavedParty = useCallback((savedParty: SavedParty) => {
    const newParty: (Pokemon | null)[] = [null, null, null, null, null, null];
    savedParty.pokemon_ids.slice(0, 6).forEach((id, i) => {
      const found = pokemonMap.get(id);
      if (found) newParty[i] = found;
    });
    setParty(newParty);
    setPartyListOpen(false);
    setAnalysis(null);
    setAnalyzeError(null);
  }, [pokemonMap]);

  const selectedCount = party.filter((p) => p !== null).length;

  const handleAnalyze = useCallback(async () => {
    const pokemonIds = party
      .filter((p): p is Pokemon => p !== null)
      .map((p) => String(p.id));
    if (pokemonIds.length === 0) return;
    try {
      setAnalyzing(true);
      setAnalyzeError(null);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pokemonIds }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '분석에 실패했습니다.');
      }
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalyzeError(getClientErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }, [party]);

  useEffect(() => {
    if (shouldAutoAnalyze) {
      setShouldAutoAnalyze(false);
      handleAnalyze();
    }
  }, [shouldAutoAnalyze, handleAnalyze]);

  const totalScore = analysis ? analysis.coverageScore : 0;

  return (
    <div className={`min-h-screen ${UI.pageBg}`}>
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* 페이지 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            파티 분석
          </h1>
          <p className="mt-2 text-slate-500">
            포켓몬을 선택하고 파티의 타입 커버리지와 밸런스를 분석해보세요.
          </p>
        </div>

        {/* 파티 구성 영역 — 내 파티 가져오기를 오른쪽에 배치 */}
        <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6 mb-8`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              파티 구성
            </h2>

            {/* 내 파티 가져오기 — 오른쪽 상단 */}
            {user && (
              <div className="relative" ref={partyListRef}>
                <button
                  onClick={handleLoadMyParties}
                  disabled={partyLoading || pokemonLoading}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl
                    border-2 font-medium text-sm
                    ${partyListOpen
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
                  내 파티 가져오기
                </button>

                {partyLoadError && (
                  <p className="absolute right-0 mt-1 text-xs text-red-500 whitespace-nowrap">{partyLoadError}</p>
                )}

                {partyListOpen && (
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
                              onClick={() => handleSelectSavedParty(sp)}
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
                                {sp.pokemon_ids.slice(0, 6).map((id) => {
                                  return pokemonMap.get(id)?.name ?? `#${id}`;
                                }).join(', ')}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {pokemonError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {pokemonError}
            </div>
          )}

          {/* 슬롯 6개 */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {party.map((pokemon, index) => (
              <PartySlot
                key={index}
                slotNumber={index + 1}
                pokemon={pokemon ?? undefined}
                onAdd={() => handleSlotClick(index)}
                onRemove={pokemon ? () => handleRemove(index) : undefined}
              />
            ))}
          </div>

          {/* 분석하기 버튼 */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={selectedCount < 1 || analyzing || pokemonLoading}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl
                bg-indigo-600 text-white font-semibold text-base
                hover:bg-indigo-700 active:bg-indigo-800
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  분석하기
                </>
              )}
            </button>
          </div>
        </div>

        {/* 분석 에러 */}
        {analyzeError && (
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {analyzeError}
          </div>
        )}

        {/* 분석 결과 */}
        {analysis && (
          <div className="space-y-6">
            {/* 종합 점수 + 약점/내성 — 3컬럼 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* 종합 점수 / 등급 */}
              <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6 flex flex-col items-center justify-center`}>
                {analysis.gradeInfo ? (
                  <>
                    <h2 className="text-sm font-semibold text-slate-500 mb-3">파티 등급</h2>
                    <div className={`text-7xl font-black ${getGradeColor(analysis.gradeInfo.grade)}`}>
                      {analysis.gradeInfo.grade}
                    </div>
                    <div className="text-sm text-slate-500 mt-2">
                      {analysis.gradeInfo.totalScore}점 · {getGradeLabel(analysis.gradeInfo.grade)}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-sm font-semibold text-slate-500 mb-3">
                      종합 점수
                    </h2>
                    <div className={`text-6xl font-bold ${getScoreColor(totalScore)}`}>
                      {totalScore}
                    </div>
                    <div className="text-sm text-slate-500 mt-2">
                      {getScoreLabel(totalScore)}
                    </div>
                  </>
                )}
              </div>

              {/* 약점 */}
              <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    약점 타입
                  </h2>
                </div>
                {analysis.weaknesses.length > 0 ? (
                  <div className="bg-red-50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {analysis.weaknesses.map((type) => (
                        <div key={type} className="flex items-center gap-1.5">
                          <TypeBadge type={type} size="lg" />
                          <span className="text-xs text-red-600 font-medium">
                            {analysis.typeMatchups[type]?.toFixed(1)}x
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-red-500">
                      파티의 절반 이상이 이 타입에 약점을 가지고 있습니다.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    뚜렷한 약점 타입이 없습니다. 좋은 구성이에요!
                  </p>
                )}
              </div>

              {/* 내성 */}
              <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    내성 타입
                  </h2>
                </div>
                {analysis.resistances.length > 0 ? (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {analysis.resistances.map((type) => (
                        <div key={type} className="flex items-center gap-1.5">
                          <TypeBadge type={type} size="lg" />
                          <span className="text-xs text-blue-600 font-medium">
                            {analysis.typeMatchups[type]?.toFixed(1)}x
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-blue-500">
                      파티의 절반 이상이 이 타입에 내성을 가지고 있습니다.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    뚜렷한 내성 타입이 없습니다.
                  </p>
                )}
              </div>
            </div>

            {/* 세부 점수 프로그레스 바 */}
            {analysis.gradeInfo && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-300 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">세부 점수</h2>
                <div className="space-y-4">
                  {/* 공격 커버리지 */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">공격 커버리지</span>
                      <span className="font-semibold text-slate-900">{analysis.gradeInfo.breakdown.offense}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${analysis.gradeInfo.breakdown.offense}%` }} />
                    </div>
                  </div>
                  {/* 방어 밸런스 */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">방어 밸런스</span>
                      <span className="font-semibold text-slate-900">{analysis.gradeInfo.breakdown.defense}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${analysis.gradeInfo.breakdown.defense}%` }} />
                    </div>
                  </div>
                  {/* 타입 다양성 */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">타입 다양성</span>
                      <span className="font-semibold text-slate-900">{analysis.gradeInfo.breakdown.diversity}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analysis.gradeInfo.breakdown.diversity}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 개선 제안 */}
            {analysis.gradeInfo && analysis.gradeInfo.suggestions.length > 0 && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
                <h2 className="text-lg font-semibold text-amber-800 mb-3">개선 제안</h2>
                <ul className="space-y-2">
                  {analysis.gradeInfo.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 공격 커버리지 */}
            <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6`}>
              <div className="flex items-center gap-2 mb-4">
                <Swords className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-slate-900">
                  공격 커버리지
                </h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                파티가 효과적으로 공격할 수 있는 타입 ({analysis.coverage.length}/{ALL_TYPES.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_TYPES.map((type) => {
                  const isCovered = analysis.coverage.includes(type);
                  return (
                    <div
                      key={type}
                      className={`rounded-lg px-1 py-0.5 ${
                        isCovered
                          ? 'opacity-100'
                          : 'opacity-30 grayscale'
                      }`}
                    >
                      <TypeBadge type={type} size="lg" />
                    </div>
                  );
                })}
              </div>
              {analysis.coverage.length < ALL_TYPES.length && (
                <p className="mt-3 text-xs text-slate-400">
                  회색 타입은 효과적으로 공격할 수 없는 타입입니다.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 포켓몬 검색 모달 */}
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
