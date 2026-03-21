'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Pokemon, AnalysisResult } from '@/types/pokemon';
import { ALL_TYPES } from '@/lib/type-calc';
import PartySlot from '@/components/PartySlot';
import PokemonSearchModal from '@/components/PokemonSearchModal';
import TypeBadge from '@/components/TypeBadge';
import { Loader2, BarChart3, Shield, Swords, AlertTriangle } from 'lucide-react';
import { UI } from '@/lib/ui-tokens';

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

  // 파티 상태 (최대 6마리)
  const [party, setParty] = useState<(Pokemon | null)[]>([null, null, null, null, null, null]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number>(0);

  // 포켓몬 목록
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [pokemonLoading, setPokemonLoading] = useState(true);
  const [pokemonError, setPokemonError] = useState<string | null>(null);

  // 분석 결과
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // URL에서 전달된 pokemon_ids 자동 세팅 여부
  const autoAnalyzeDone = useRef(false);

  // 포켓몬 목록 로드
  useEffect(() => {
    async function fetchPokemon() {
      try {
        setPokemonLoading(true);
        const res = await fetch('/api/pokemon');
        if (!res.ok) throw new Error('포켓몬 목록을 불러올 수 없습니다.');
        const data = await res.json();
        setAllPokemon(data.pokemon);
      } catch (err) {
        setPokemonError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        setPokemonLoading(false);
      }
    }
    fetchPokemon();
  }, []);

  // URL의 pokemon_ids로 파티 자동 세팅
  const [shouldAutoAnalyze, setShouldAutoAnalyze] = useState(false);

  useEffect(() => {
    if (autoAnalyzeDone.current || allPokemon.length === 0) return;

    const idsParam = searchParams.get('pokemon_ids');
    if (!idsParam) return;

    const ids = idsParam.split(',').map(Number).filter((id) => !isNaN(id) && id > 0);
    if (ids.length === 0) return;

    const newParty: (Pokemon | null)[] = [null, null, null, null, null, null];
    ids.slice(0, 6).forEach((id, i) => {
      const found = allPokemon.find((p) => p.id === id);
      if (found) newParty[i] = found;
    });

    setParty(newParty);
    setShouldAutoAnalyze(true);
    autoAnalyzeDone.current = true;
  }, [allPokemon, searchParams]);

  // 슬롯 클릭 → 모달 열기
  const handleSlotClick = (index: number) => {
    setActiveSlot(index);
    setModalOpen(true);
  };

  // 포켓몬 선택
  const handleSelect = (pokemon: Pokemon) => {
    setParty((prev) => {
      const next = [...prev];
      next[activeSlot] = pokemon;
      return next;
    });
    // 분석 결과 초기화
    setAnalysis(null);
    setAnalyzeError(null);
  };

  // 포켓몬 제거
  const handleRemove = (index: number) => {
    setParty((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setAnalysis(null);
    setAnalyzeError(null);
  };

  // 선택된 포켓몬 수
  const selectedCount = party.filter((p) => p !== null).length;

  // 분석 실행
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
      setAnalyzeError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setAnalyzing(false);
    }
  }, [party]);

  // URL에서 파티 세팅 후 자동 분석 실행
  useEffect(() => {
    if (shouldAutoAnalyze) {
      setShouldAutoAnalyze(false);
      handleAnalyze();
    }
  }, [shouldAutoAnalyze, handleAnalyze]);

  // 레이더 차트 데이터 변환
  const radarData = analysis
    ? ALL_TYPES.map((type) => ({
        type,
        value: analysis.typeMatchups[type] ?? 1,
      }))
    : [];

  // 종합 점수
  const totalScore = analysis
    ? analysis.coverageScore
    : 0;

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

        {/* 파티 선택 영역 */}
        <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6 mb-8`}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            파티 구성
          </h2>

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
          <div className="mt-6 text-center">
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
            {selectedCount === 0 && (
              <p className="mt-2 text-sm text-slate-400">
                최소 1마리 이상의 포켓몬을 선택해주세요.
              </p>
            )}
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
            {/* 종합 점수 */}
            <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6`}>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                종합 점수
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
                {/* 총점 */}
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreColor(totalScore)}`}>
                    {totalScore}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    종합 ({getScoreLabel(totalScore)})
                  </div>
                </div>
                {/* 세부 점수 */}
                <div className="flex gap-8">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(analysis.coverageScore)}`}>
                      {analysis.coverageScore}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      커버리지
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 타입 커버리지 레이더 차트 */}
            <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6`}>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                타입 방어 매치업
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                1.0 이상일수록 해당 타입에 취약하고, 1.0 미만일수록 내성이 있습니다.
              </p>
              <div className="w-full h-[400px] sm:h-[450px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#94a3b8" />
                    <PolarAngleAxis
                      dataKey="type"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 4]}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    {/* 내성 영역 (1.0 미만) — 파란색 */}
                    <Radar
                      name="매치업"
                      dataKey="value"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#f1f5f9',
                        fontSize: '0.875rem',
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => {
                        const num = Number(value ?? 1);
                        const label = num > 1 ? '약점' : num < 1 ? '내성' : '보통';
                        return [`${num.toFixed(2)}x (${label})`, '배율'];
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 약점 / 내성 목록 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
