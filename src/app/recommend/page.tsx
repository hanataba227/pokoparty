'use client';

import { useState, useEffect, useCallback } from 'react';
import StepIndicator from '@/components/StepIndicator';
import StoryPointSelector from '@/components/StoryPointSelector';
import PartySlot from '@/components/PartySlot';
import PokemonSearchModal from '@/components/PokemonSearchModal';
import PokemonCard from '@/components/PokemonCard';
import type { StoryPoint, Pokemon, ScoringBreakdown } from '@/types/pokemon';
import { Loader2, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';

const STEPS = ['게임 선택', '스토리 포인트', '고정 포켓몬', '추천 결과'];

const GAME_TITLES = [
  { id: 'gen8-swsh-sword', label: '소드', gameId: 'gen8-swsh', icon: '🗡️' },
  { id: 'gen8-swsh-shield', label: '실드', gameId: 'gen8-swsh', icon: '🛡️' },
  { id: 'gen8-pla', label: '레전드 아르세우스', gameId: 'gen8-pla', icon: '⭐', disabled: true },
  { id: 'gen9-sv-scarlet', label: '스칼렛', gameId: 'gen9-sv', icon: '🔴', disabled: true },
  { id: 'gen9-sv-violet', label: '바이올렛', gameId: 'gen9-sv', icon: '🟣', disabled: true },
];

interface RecommendationItem {
  pokemon: Pokemon;
  score: number;
  reasons: string[];
  role: string;
  breakdown: ScoringBreakdown;
}

export default function RecommendPage() {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: 게임 선택
  const [selectedGameId, setSelectedGameId] = useState<string>();

  // Step 2: 스토리 포인트
  const [storyPoints, setStoryPoints] = useState<StoryPoint[]>([]);
  const [selectedStoryPointId, setSelectedStoryPointId] = useState<string>();
  const [storyPointsLoading, setStoryPointsLoading] = useState(false);
  const [storyPointsError, setStoryPointsError] = useState<string>();

  // Step 3: 고정 포켓몬
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [fixedPokemon, setFixedPokemon] = useState<(Pokemon | undefined)[]>(
    Array(6).fill(undefined)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [pokemonLoading, setPokemonLoading] = useState(false);
  const [pokemonError, setPokemonError] = useState<string>();

  // Step 4: 추천 결과
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState<string>();

  // Step 2: 스토리 포인트 로드 (게임 선택 후)
  useEffect(() => {
    if (currentStep < 2 || !selectedGameId) return;
    if (storyPoints.length > 0) return;

    async function fetchStoryPoints() {
      try {
        setStoryPointsLoading(true);
        setStoryPointsError(undefined);
        const res = await fetch('/api/story-points');
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '스토리 포인트를 불러오지 못했습니다.');
        }
        const data = await res.json();
        setStoryPoints(data.storyPoints);
      } catch (err) {
        setStoryPointsError(
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
        );
      } finally {
        setStoryPointsLoading(false);
      }
    }
    fetchStoryPoints();
  }, [currentStep, selectedGameId, storyPoints.length]);

  // Step 3: 포켓몬 목록 로드 (Step 3 진입 시)
  useEffect(() => {
    if (currentStep < 3 || allPokemon.length > 0) return;

    async function fetchPokemon() {
      try {
        setPokemonLoading(true);
        setPokemonError(undefined);
        const res = await fetch('/api/pokemon');
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '포켓몬 목록을 불러오지 못했습니다.');
        }
        const data = await res.json();
        setAllPokemon(data.pokemon);
      } catch (err) {
        setPokemonError(
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
        );
      } finally {
        setPokemonLoading(false);
      }
    }
    fetchPokemon();
  }, [currentStep, allPokemon.length]);

  // Step 4: 추천 요청
  const fetchRecommendations = useCallback(async () => {
    if (!selectedStoryPointId) return;

    try {
      setRecommendLoading(true);
      setRecommendError(undefined);

      const fixed = fixedPokemon
        .filter((p): p is Pokemon => p !== undefined)
        .map((p) => String(p.id));

      const slotsToFill = 6 - fixed.length;

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyPointId: selectedStoryPointId,
          fixedPokemon: fixed,
          slotsToFill,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '추천을 가져오지 못했습니다.');
      }

      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setRecommendError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setRecommendLoading(false);
    }
  }, [selectedStoryPointId, fixedPokemon]);

  // Step 진행 시 추천 요청
  useEffect(() => {
    if (currentStep === 4) {
      fetchRecommendations();
    }
  }, [currentStep, fetchRecommendations]);

  const handleSlotClick = (index: number) => {
    setActiveSlot(index);
    setModalOpen(true);
  };

  const handlePokemonSelect = (pokemon: Pokemon) => {
    setFixedPokemon((prev) => {
      const updated = [...prev];
      updated[activeSlot] = pokemon;
      return updated;
    });
  };

  const handleRemovePokemon = (index: number) => {
    setFixedPokemon((prev) => {
      const updated = [...prev];
      updated[index] = undefined;
      return updated;
    });
  };

  const canGoNext = () => {
    if (currentStep === 1) return !!selectedGameId;
    if (currentStep === 2) return !!selectedStoryPointId;
    if (currentStep === 3) return true; // 고정 포켓몬은 선택사항
    return false;
  };

  const goNext = () => {
    if (currentStep < 4) setCurrentStep((s) => s + 1);
  };

  const goPrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const fixedPokemonList = fixedPokemon.filter((p): p is Pokemon => p !== undefined);

  return (
    <div className="min-h-screen py-8">
      <h1 className="text-3xl font-extrabold text-center text-slate-900 mb-2">
        파티 추천
      </h1>
      <p className="text-center text-slate-500 mb-8">
        체육관에 맞는 최적의 파티를 추천받으세요.
      </p>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {GAME_TITLES.map((game) => (
                <button
                  key={game.id}
                  onClick={() => !game.disabled && setSelectedGameId(game.id)}
                  disabled={!!game.disabled}
                  className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200
                    ${game.disabled
                      ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                      : selectedGameId === game.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-indigo-300 cursor-pointer'
                    }`}
                >
                  <span className="text-3xl">{game.icon}</span>
                  <span className={`font-bold text-lg ${selectedGameId === game.id
                    ? 'text-indigo-600'
                    : 'text-slate-800'
                    }`}>
                    {game.label}
                  </span>
                  {game.disabled && (
                    <span className="text-xs text-slate-400">
                      준비 중
                    </span>
                  )}
                  {selectedGameId === game.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== Step 2: 스토리 포인트 선택 ===== */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              어디까지 진행하셨나요?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              공략할 체육관을 선택해주세요. 해당 시점까지 잡을 수 있는 포켓몬을 기반으로 추천합니다.
            </p>

            {storyPointsLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-slate-500">스토리 포인트 로딩 중...</span>
              </div>
            )}

            {storyPointsError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                {storyPointsError}
              </div>
            )}

            {!storyPointsLoading && !storyPointsError && (
              <StoryPointSelector
                storyPoints={storyPoints}
                selectedId={selectedStoryPointId}
                onSelect={setSelectedStoryPointId}
              />
            )}
          </div>
        )}

        {/* ===== Step 3: 고정 포켓몬 선택 ===== */}
        {currentStep === 3 && (
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
                      pokemon={pokemon}
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
              </>
            )}
          </div>
        )}

        {/* ===== Step 4: 추천 결과 ===== */}
        {currentStep === 4 && (
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
                추천 결과가 없습니다. 다른 스토리 포인트를 선택해보세요.
              </div>
            )}

            {!recommendLoading && !recommendError && (fixedPokemonList.length > 0 || recommendations.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 네비게이션 버튼 */}
      <div className="flex items-center justify-between mt-12 pt-6 border-t border-slate-200">
        <button
          onClick={goPrev}
          disabled={currentStep === 1}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
            text-slate-600 font-medium
            border border-slate-300
            hover:border-slate-400 hover:text-slate-800
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors duration-200 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <ChevronLeft className="w-4 h-4" />
          이전
        </button>

        <div className="flex items-center gap-3">
          {currentStep === 3 && (
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

          {currentStep < 4 && (
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
  );
}
