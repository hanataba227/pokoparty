'use client';

import StepIndicator from '@/components/StepIndicator';
import PartySlot from '@/components/PartySlot';
import PokemonSearchModal from '@/components/PokemonSearchModal';
import PokemonCard from '@/components/PokemonCard';
import GameSelector from '@/components/GameSelector';
import { useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ChevronDown, SkipForward, Save, LogIn, SlidersHorizontal, Filter, RefreshCw, Info } from 'lucide-react';
import ScoreGuideModal from '@/components/ScoreGuideModal';
import { TYPE_COLORS } from '@/components/TypeBadge';
import { UI } from '@/lib/ui-tokens';
import { ALL_TYPES } from '@/lib/type-calc';
import Link from 'next/link';
import { useRecommendState } from '@/hooks/useRecommendState';

const STEPS = ['게임 선택', '고정 포켓몬', '추천 결과'];

export default function RecommendPage() {
  const [guideOpen, setGuideOpen] = useState(false);
  const {
    currentStep,
    setCurrentStep,
    canGoNext,
    goNext,
    goPrev,
    selectedGameId,
    setSelectedGameId,
    includeDlc,
    setIncludeDlc,
    fixedPokemon,
    modalOpen,
    setModalOpen,
    handleSlotClick,
    handlePokemonSelect,
    handleRemovePokemon,
    fixedPokemonList,
    allPokemon,
    pokemonLoading,
    pokemonError,
    basicOpen, setBasicOpen,
    typeOpen, setTypeOpen,
    excludeTradeEvolution, setExcludeTradeEvolution,
    excludeItemEvolution, setExcludeItemEvolution,
    includeStarters, setIncludeStarters,
    finalOnly, setFinalOnly,
    gen8Only, setGen8Only,
    selectedTypes, setSelectedTypes,
    recommendations,
    parties,
    activePartyIndex,
    setActivePartyIndex,
    recommendLoading,
    recommendError,
    fetchRecommendations,
    user,
    saving,
    saveSuccess,
    saveError,
    handleSaveParty,
  } = useRecommendState();

  return (
    <div className={`min-h-screen ${UI.pageBg}`}>
      <ScoreGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            파티 추천
          </h1>
          <p className="mt-2 text-slate-500">
            최적의 파티를 추천받으세요.
          </p>
        </div>

      <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />

      <div className="mt-8">
        {/* ===== Step 1: 게임 타이틀 선택 ===== */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              어떤 게임을 플레이하시나요?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              플레이 중인 게임 타이틀을 선택해주세요.
            </p>

            <GameSelector
              selectedGameId={selectedGameId}
              onSelect={(id) => setSelectedGameId(id === selectedGameId ? null : id)}
              includeDlc={includeDlc}
              onDlcToggle={setIncludeDlc}
            />
          </div>
        )}

        {/* ===== Step 2: 고정 포켓몬 선택 ===== */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              이미 키우고 있는 포켓몬이 있나요?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              파티에 포함할 포켓몬을 선택해주세요. 나머지 슬롯을 자동으로 추천합니다.
            </p>

            {pokemonLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-slate-500">포켓몬 목록 로딩 중...</span>
              </div>
            )}

            {pokemonError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
                {pokemonError}
              </div>
            )}

            {!pokemonLoading && !pokemonError && (
              <>
                <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                  {fixedPokemon.map((pokemon, index) => (
                    <PartySlot
                      key={index}
                      pokemon={pokemon ?? undefined}
                      slotNumber={index + 1}
                      onAdd={() => handleSlotClick(index)}
                      onRemove={pokemon ? () => handleRemovePokemon(index) : undefined}
                    />
                  ))}
                </div>

                <PokemonSearchModal
                  isOpen={modalOpen}
                  onClose={() => setModalOpen(false)}
                  onSelect={handlePokemonSelect}
                  availablePokemon={allPokemon}
                />

                {/* 추천 옵션 (카테고리 분리형) */}
                <div className="mt-8 max-w-2xl mx-auto space-y-3">
                  {/* Panel 1: 기본 옵션 */}
                  <div className={`${UI.border} overflow-hidden`}>
                    <button
                      type="button"
                      onClick={() => setBasicOpen(!basicOpen)}
                      className={`flex w-full items-center justify-between ${UI.pageBg} px-4 py-2.5 text-sm font-medium text-slate-700 ${UI.hoverBg} transition-colors ${basicOpen ? `border-b ${UI.rowBorder}` : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                        기본 옵션
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${basicOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {basicOpen && (
                      <div className={`space-y-3 ${UI.pageBg} p-4`}>
                        {([
                          { on: !excludeTradeEvolution, onToggle: () => setExcludeTradeEvolution(v => !v), label: '통신 교환 진화 포함' },
                          { on: !excludeItemEvolution, onToggle: () => setExcludeItemEvolution(v => !v), label: '조건(도구, 돌 등) 진화 포함' },
                          { on: includeStarters, onToggle: () => setIncludeStarters(v => !v), label: '스타팅 포켓몬 포함' },
                          { on: finalOnly, onToggle: () => setFinalOnly(v => !v), label: '최종 진화 포켓몬만 포함' },
                          { on: gen8Only, onToggle: () => setGen8Only(v => !v), label: '8세대 포켓몬만 포함' },
                        ] as const).map(({ on, onToggle, label }) => (
                          <label key={label} className="flex items-center justify-between gap-3 cursor-pointer select-none">
                            <span className="text-sm text-slate-700">{label}</span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={on}
                              onClick={onToggle}
                              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer ${on ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Panel 2: 타입 필터 */}
                  <div className={`${UI.border} overflow-hidden`}>
                    <button
                      type="button"
                      onClick={() => setTypeOpen(!typeOpen)}
                      className={`flex w-full items-center justify-between ${UI.pageBg} px-4 py-2.5 text-sm font-medium text-slate-700 ${UI.hoverBg} transition-colors ${typeOpen ? `border-b ${UI.rowBorder}` : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-indigo-600" />
                        타입 필터
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${typeOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {typeOpen && (
                      <div className={`${UI.pageBg} p-4`}>
                        <p className="text-xs text-slate-400 mb-3">선택된 타입의 포켓몬만 포함</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_TYPES.map((t) => {
                            const active = selectedTypes.has(t);
                            const color = TYPE_COLORS[t];
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setSelectedTypes(prev => {
                                  const next = new Set(prev);
                                  if (next.has(t)) next.delete(t); else next.add(t);
                                  return next;
                                })}
                                className="rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-150"
                                style={{
                                  backgroundColor: active ? color : `${color}20`,
                                  color: active ? '#fff' : color,
                                  border: `1.5px solid ${color}`,
                                }}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <span className="text-xs text-slate-500">
                            {selectedTypes.size === 0
                              ? '선택 없음 (전체 타입 추천)'
                              : <><span className="font-semibold text-indigo-600">{selectedTypes.size}</span> 타입 선택됨</>
                            }
                          </span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setSelectedTypes(new Set(ALL_TYPES))} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                              전체 선택
                            </button>
                            <span className="text-slate-300">|</span>
                            <button type="button" onClick={() => setSelectedTypes(new Set())} className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
                              초기화
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== Step 3: 추천 결과 ===== */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              추천 파티
            </h2>

            {recommendLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <span className="text-slate-500">
                  최적의 파티를 계산하고 있습니다...
                </span>
              </div>
            )}

            {recommendError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                {recommendError}
              </div>
            )}

            {!recommendLoading && !recommendError && recommendations.length === 0 && fixedPokemonList.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                추천 결과가 없습니다. 필터 옵션을 조정해보세요.
              </div>
            )}

            {!recommendLoading && !recommendError && (fixedPokemonList.length > 0 || recommendations.length > 0) && (
              <>
                {/* 파티 전환 UI */}
                {parties.length > 1 && (
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
                        onClick={() => setGuideOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
                          text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      >
                        <Info className="w-3.5 h-3.5" />
                        항목 안내
                      </button>
                      <button
                        onClick={() => setActivePartyIndex((i: number) => Math.max(0, i - 1))}
                        disabled={activePartyIndex === 0}
                        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </button>
                      <button
                        onClick={() => setActivePartyIndex((i: number) => Math.min(parties.length - 1, i + 1))}
                        disabled={activePartyIndex === parties.length - 1}
                        className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {/* 내가 선택한 포켓몬 (고정 멤버) */}
                  {fixedPokemonList.map((pokemon) => (
                    <PokemonCard
                      key={`fixed-${pokemon.id}`}
                      pokemon={pokemon}
                      isFixed
                    />
                  ))}

                  {/* 추천 포켓몬 */}
                  {recommendations.map((rec) => (
                    <PokemonCard
                      key={rec.pokemon.id}
                      pokemon={rec.pokemon}
                      score={rec.breakdown}
                      totalScore={rec.score}
                      detailedReasons={rec.detailedReasons}
                    />
                  ))}
                </div>

                {/* 다른 조합 보기 + 파티 저장 */}
                <div className="mt-8 flex items-center justify-center gap-4">
                  <button
                    onClick={fetchRecommendations}
                    disabled={recommendLoading}
                    className="w-52 inline-flex items-center justify-center gap-2 py-3 rounded-xl
                      border-2 border-indigo-300 text-indigo-600 font-semibold text-base
                      hover:bg-indigo-50 hover:border-indigo-400
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200 cursor-pointer
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <RefreshCw className={`w-5 h-5 ${recommendLoading ? 'animate-spin' : ''}`} />
                    다른 조합 보기
                  </button>

                  <div className="w-52">
                    {saveSuccess ? (
                      <span className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 border-2 border-green-300 text-green-600 font-semibold text-base">
                        <Save className="w-5 h-5" />저장 완료!
                      </span>
                    ) : user ? (
                      <>
                        <button onClick={handleSaveParty} disabled={saving}
                          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl
                            bg-indigo-600 text-white font-semibold text-base
                            hover:bg-indigo-700 active:bg-indigo-800
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-colors duration-200 cursor-pointer
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                          {saving ? (<><Loader2 className="w-5 h-5 animate-spin" />저장 중...</>) : (<><Save className="w-5 h-5" />파티 저장하기</>)}
                        </button>
                        {saveError && <p className="mt-2 text-sm text-red-500">{saveError}</p>}
                      </>
                    ) : (
                      <Link href={`/login?redirect=${encodeURIComponent('/recommend')}`}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-indigo-300 text-indigo-600 font-semibold text-base
                          hover:bg-indigo-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        <LogIn className="w-5 h-5" />로그인하고 저장
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 네비게이션 버튼 */}
      <div className={`flex items-center justify-between mt-12 pt-6 border-t ${UI.rowBorder}`}>
        <button
          onClick={goPrev}
          disabled={currentStep === 1}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
            text-slate-600 font-medium
            ${UI.border}
            hover:border-slate-400 hover:text-slate-800
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors duration-200 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
        >
          <ChevronLeft className="w-4 h-4" />
          이전
        </button>

        <div className="flex items-center gap-3">
          {currentStep === 2 && (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                text-slate-500 font-medium
                hover:text-indigo-600
                transition-colors duration-200 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <SkipForward className="w-4 h-4" />
              선택 없이 넘어가기
            </button>
          )}

          {currentStep < 3 && (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl
                bg-indigo-600 text-white font-semibold
                hover:bg-indigo-700
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors duration-200 cursor-pointer
                shadow-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
