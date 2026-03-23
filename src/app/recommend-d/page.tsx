'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import StepIndicator from '@/components/StepIndicator';
import PartySlot from '@/components/PartySlot';
import PokemonSearchModal from '@/components/PokemonSearchModal';
import GameSelector from '@/components/GameSelector';
import TypeBadge from '@/components/TypeBadge';
import { Loader2, ChevronLeft, ChevronRight, ChevronDown, SkipForward, Save, LogIn, SlidersHorizontal, Filter, RefreshCw, Info } from 'lucide-react';
import { TYPE_COLORS } from '@/components/TypeBadge';
import { UI } from '@/lib/ui-tokens';
import { ALL_TYPES } from '@/lib/type-calc';
import { useRecommendState } from '@/hooks/useRecommendState';
import type { Pokemon, ScoringBreakdown, DetailedReason } from '@/types/pokemon';
import { getFinalScore } from '@/lib/score-utils';
import { getSpriteUrl } from '@/lib/sprite';

const STEPS = ['게임 선택', '고정 포켓몬', '추천 결과'];

const SCORE_DESCRIPTIONS: Record<string, string> = {
  combatFitness: '종족값 분포, 스피드, 기술 분포를 종합한 전투 능력',
  acquisition: '게임 초반에 얻을수록 높은 점수',
  stabPower: '종족값 분포에 맞는 기술을 배울 수 있으면 높은 점수',
  moveCoverage: '다양한 타입의 적을 상대할 수 있으면 높은 점수',
  evolutionEase: '최종 진화까지의 난이도. 레벨 진화, 통신 교환 등',
};

const SCORE_ITEMS = [
  { key: 'combatFitness', label: '전투적합도' },
  { key: 'acquisition', label: '입수시기' },
  { key: 'stabPower', label: '자속화력' },
  { key: 'moveCoverage', label: '기술폭' },
  { key: 'evolutionEase', label: '진화용이성' },
] as const;

const REASON_LABELS: Record<DetailedReason['category'], { icon: string; label: string }> = {
  move: { icon: '⚔️', label: '기술' },
  evolution: { icon: '🔄', label: '진화' },
  coverage: { icon: '🎯', label: '커버리지' },
  tip: { icon: '💡', label: '팁' },
};

// ===== 항목 안내 모달 =====
function ScoreGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">항목 안내</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {SCORE_ITEMS.map((item) => (
            <div key={item.key}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-800">{item.label}</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                {SCORE_DESCRIPTIONS[item.key]}
              </p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400 leading-relaxed">
            각 항목은 0~100점으로 평가되며, 가중치를 적용해 종합 점수를 산출합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== D 스타일 PokemonCard (모달 방식 — 카드 자체는 깔끔) =====
const PokemonCardD = memo(function PokemonCardD({
  pokemon, score, detailedReasons, isFixed,
}: {
  pokemon: Pokemon;
  score?: ScoringBreakdown;
  detailedReasons?: DetailedReason[];
  isFixed?: boolean;
}) {
  const spriteUrl = getSpriteUrl(pokemon.id);
  const totalScore = score ? Math.round(getFinalScore(score)) : null;

  return (
    <div
      className={`relative bg-white border rounded-xl p-4
        hover:shadow-sm transition-all duration-200
        ${isFixed
          ? 'border-amber-400 ring-1 ring-amber-200'
          : `${UI.rowBorder} hover:border-indigo-300`
        }`}
    >
      {isFixed && (
        <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          MY
        </div>
      )}

      <Link href={`/pokemon/${pokemon.id}`}>
        <div className="w-20 h-20 mb-3 mx-auto relative">
          <Image src={spriteUrl} alt={pokemon.name} width={80} height={80} className="w-full h-full object-contain" />
        </div>
        <h3 className="text-center font-bold text-slate-900 hover:text-indigo-600 transition-colors text-lg">
          {pokemon.name}
        </h3>
      </Link>
      <p className="text-center text-slate-400 text-sm">
        #{String(pokemon.id).padStart(3, '0')}
      </p>

      <div className="flex justify-center gap-1.5 mt-2">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>

      {score && totalScore !== null && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="text-orange-500 font-bold text-lg">{totalScore}</span>
            <span className="text-slate-400 text-xs">/ 100</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-500">
            {SCORE_ITEMS.map((item) => (
              <div key={item.key} className="flex justify-between">
                <span>{item.label}</span>
                <span className="font-medium">{score[item.key]}</span>
              </div>
            ))}
          </div>

          {detailedReasons && detailedReasons.filter((r) => r.category !== 'move' && r.category !== 'coverage').length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1.5">
              {detailedReasons
                .filter((r) => r.category !== 'move' && r.category !== 'coverage')
                .map((reason, idx) => (
                  <DetailedReasonRow key={idx} reason={reason} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function DetailedReasonRow({ reason }: { reason: DetailedReason }) {
  const { icon, label } = REASON_LABELS[reason.category];
  const d = reason.details;

  return (
    <div className="flex items-start gap-1.5 text-[11px]">
      <span className="shrink-0 text-[10px] leading-4" title={label}>{icon}</span>
      <div className="min-w-0">
        {reason.category === 'move' && d?.moveName ? (
          <span className="text-slate-600">
            {d.isStab && <span className="text-amber-500 font-bold mr-0.5">★</span>}
            <span className="font-medium text-slate-700">{d.moveName}</span>
            {d.moveType && <span className="ml-1 inline-flex align-middle"><TypeBadge type={d.moveType} size="sm" /></span>}
            {d.movePower != null && d.movePower > 0 && <span className="ml-1 text-slate-400">위력{d.movePower}</span>}
            {d.learnLevel != null && <span className="ml-1 text-indigo-500">Lv{d.learnLevel}</span>}
          </span>
        ) : reason.category === 'evolution' && d?.evolutionChain ? (
          <span className="text-slate-600">
            {d.evolutionLevel != null && <span className="font-medium text-indigo-500 mr-1">Lv{d.evolutionLevel}</span>}
            <span>최종진화</span>
            <span className="ml-1 text-slate-400">({d.evolutionChain})</span>
          </span>
        ) : reason.category === 'coverage' && d?.coveredTypes && d.coveredTypes.length > 0 ? (
          <span className="text-slate-600">
            <span className="mr-1">유리한 상대:</span>
            <span className="inline-flex flex-wrap gap-0.5">
              {d.coveredTypes.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
            </span>
          </span>
        ) : (
          <span className="text-slate-500">{reason.summary}</span>
        )}
      </div>
    </div>
  );
}

// ===== 메인 페이지 =====
export default function RecommendDPage() {
  const {
    currentStep, setCurrentStep, canGoNext, goNext, goPrev,
    selectedGameId, setSelectedGameId, includeDlc, setIncludeDlc,
    fixedPokemon, modalOpen, setModalOpen, handleSlotClick, handlePokemonSelect, handleRemovePokemon, fixedPokemonList,
    allPokemon, pokemonLoading, pokemonError,
    basicOpen, setBasicOpen, typeOpen, setTypeOpen,
    excludeTradeEvolution, setExcludeTradeEvolution,
    excludeItemEvolution, setExcludeItemEvolution,
    includeStarters, setIncludeStarters,
    finalOnly, setFinalOnly,
    gen8Only, setGen8Only,
    selectedTypes, setSelectedTypes,
    recommendations, parties, activePartyIndex, setActivePartyIndex,
    recommendLoading, recommendError, fetchRecommendations,
    user, saving, saveSuccess, saveError, handleSaveParty,
  } = useRecommendState();

  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className={`min-h-screen ${UI.pageBg}`}>
      <ScoreGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">파티 추천</h1>
          <p className="mt-2 text-slate-500">최적의 파티를 추천받으세요.</p>
          <p className="mt-1 text-xs text-indigo-500 font-medium">디자인 D: 상단 도움말 토글</p>
        </div>

        <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />

        <div className="mt-8">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4">어떤 게임을 플레이하시나요?</h2>
              <p className="text-slate-500 text-sm mb-6">플레이 중인 게임 타이틀을 선택해주세요.</p>
              <GameSelector selectedGameId={selectedGameId} onSelect={(id) => setSelectedGameId(id === selectedGameId ? null : id)} includeDlc={includeDlc} onDlcToggle={setIncludeDlc} />
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4">이미 키우고 있는 포켓몬이 있나요?</h2>
              <p className="text-slate-500 text-sm mb-6">파티에 포함할 포켓몬을 선택해주세요. 나머지 슬롯을 자동으로 추천합니다.</p>

              {pokemonLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="ml-3 text-slate-500">포켓몬 목록 로딩 중...</span>
                </div>
              )}
              {pokemonError && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">{pokemonError}</div>}

              {!pokemonLoading && !pokemonError && (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                    {fixedPokemon.map((pokemon, index) => (
                      <PartySlot key={index} pokemon={pokemon ?? undefined} slotNumber={index + 1}
                        onAdd={() => handleSlotClick(index)} onRemove={pokemon ? () => handleRemovePokemon(index) : undefined} />
                    ))}
                  </div>
                  <PokemonSearchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSelect={handlePokemonSelect} availablePokemon={allPokemon} />

                  <div className="mt-8 max-w-2xl mx-auto space-y-3">
                    <div className={`${UI.border} overflow-hidden`}>
                      <button type="button" onClick={() => setBasicOpen(!basicOpen)}
                        className={`flex w-full items-center justify-between ${UI.pageBg} px-4 py-2.5 text-sm font-medium text-slate-700 ${UI.hoverBg} transition-colors ${basicOpen ? `border-b ${UI.rowBorder}` : ''}`}>
                        <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-indigo-600" />기본 옵션</span>
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
                              <button type="button" role="switch" aria-checked={on} onClick={onToggle}
                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer ${on ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`${UI.border} overflow-hidden`}>
                      <button type="button" onClick={() => setTypeOpen(!typeOpen)}
                        className={`flex w-full items-center justify-between ${UI.pageBg} px-4 py-2.5 text-sm font-medium text-slate-700 ${UI.hoverBg} transition-colors ${typeOpen ? `border-b ${UI.rowBorder}` : ''}`}>
                        <span className="flex items-center gap-2"><Filter className="h-4 w-4 text-indigo-600" />타입 필터</span>
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
                                <button key={t} type="button"
                                  onClick={() => setSelectedTypes(prev => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; })}
                                  className="rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-150"
                                  style={{ backgroundColor: active ? color : `${color}20`, color: active ? '#fff' : color, border: `1.5px solid ${color}` }}>
                                  {t}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <span className="text-xs text-slate-500">
                              {selectedTypes.size === 0 ? '선택 없음 (전체 타입 추천)' : <><span className="font-semibold text-indigo-600">{selectedTypes.size}</span> 타입 선택됨</>}
                            </span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setSelectedTypes(new Set(ALL_TYPES))} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">전체 선택</button>
                              <span className="text-slate-300">|</span>
                              <button type="button" onClick={() => setSelectedTypes(new Set())} className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">초기화</button>
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

          {/* Step 3 */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4">추천 파티</h2>

              {recommendLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                  <span className="text-slate-500">최적의 파티를 계산하고 있습니다...</span>
                </div>
              )}
              {recommendError && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{recommendError}</div>}

              {!recommendLoading && !recommendError && recommendations.length === 0 && fixedPokemonList.length === 0 && (
                <div className="text-center py-16 text-slate-400">추천 결과가 없습니다. 필터 옵션을 조정해보세요.</div>
              )}

              {!recommendLoading && !recommendError && (fixedPokemonList.length > 0 || recommendations.length > 0) && (
                <>
                  {/* 파티 전환 + 도움말 토글 */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      {parties.length > 1 && parties.map((_, idx) => (
                        <button key={idx} onClick={() => setActivePartyIndex(idx)}
                          className={`w-9 h-9 rounded-full text-sm font-bold transition-all duration-200 cursor-pointer
                            ${activePartyIndex === idx ? 'bg-indigo-600 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
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

                      {parties.length > 1 && (
                        <>
                          <button onClick={() => setActivePartyIndex((i: number) => Math.max(0, i - 1))} disabled={activePartyIndex === 0}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                          </button>
                          <button onClick={() => setActivePartyIndex((i: number) => Math.min(parties.length - 1, i + 1))} disabled={activePartyIndex === parties.length - 1}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                    {fixedPokemonList.map((pokemon) => (
                      <PokemonCardD key={`fixed-${pokemon.id}`} pokemon={pokemon} isFixed  />
                    ))}
                    {recommendations.map((rec) => (
                      <PokemonCardD key={rec.pokemon.id} pokemon={rec.pokemon} score={rec.breakdown} detailedReasons={rec.detailedReasons}  />
                    ))}
                  </div>

                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button onClick={fetchRecommendations} disabled={recommendLoading}
                      className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-indigo-300 text-indigo-600 font-semibold text-base
                        hover:bg-indigo-50 hover:border-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                      <RefreshCw className={`w-5 h-5 ${recommendLoading ? 'animate-spin' : ''}`} />
                      다른 조합 보기
                    </button>

                    {saveSuccess ? (
                      <p className="text-green-600 font-medium">파티가 저장되었습니다!</p>
                    ) : user ? (
                      <>
                        <button onClick={handleSaveParty} disabled={saving}
                          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base
                            hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                          {saving ? (<><Loader2 className="w-5 h-5 animate-spin" />저장 중...</>) : (<><Save className="w-5 h-5" />파티 저장하기</>)}
                        </button>
                        {saveError && <p className="mt-2 text-sm text-red-500">{saveError}</p>}
                      </>
                    ) : (
                      <Link href={`/login?redirect=${encodeURIComponent('/recommend-d')}`}
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-indigo-300 text-indigo-600 font-semibold text-base
                          hover:bg-indigo-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        <LogIn className="w-5 h-5" />로그인하고 파티 저장하기
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 네비게이션 */}
        <div className={`flex items-center justify-between mt-12 pt-6 border-t ${UI.rowBorder}`}>
          <button onClick={goPrev} disabled={currentStep === 1}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-600 font-medium ${UI.border}
              hover:border-slate-400 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}>
            <ChevronLeft className="w-4 h-4" />이전
          </button>
          <div className="flex items-center gap-3">
            {currentStep === 2 && (
              <button onClick={goNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-500 font-medium hover:text-indigo-600 transition-colors duration-200 cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                <SkipForward className="w-4 h-4" />선택 없이 넘어가기
              </button>
            )}
            {currentStep < 3 && (
              <button onClick={goNext} disabled={!canGoNext()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer shadow-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                다음<ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
