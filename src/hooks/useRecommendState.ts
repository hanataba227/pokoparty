'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Pokemon, ScoringBreakdown, PokemonType, DetailedReason } from '@/types/pokemon';
import { ALL_TYPES } from '@/lib/type-calc';
import { useAuth } from '@/contexts/AuthContext';
import { cachedFetch } from '@/lib/client-cache';
import { getClientErrorMessage } from '@/lib/error-utils';

import { getGameById } from '@/lib/game-data';

export interface RecommendationItem {
  pokemon: Pokemon;
  score: number;
  reasons: string[];
  role: string;
  breakdown: ScoringBreakdown;
  detailedReasons?: DetailedReason[];
}

/** Step 1: 게임 선택 상태 */
function useGameSelection() {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [includeDlc, setIncludeDlc] = useState(false);

  // game-data.ts에 등록된 게임 ID를 그대로 gameVersion으로 사용
  // getGameById로 유효성 검증하여 미등록 ID는 null 처리
  const gameVersion = selectedGameId && getGameById(selectedGameId) ? selectedGameId : null;

  return { selectedGameId, setSelectedGameId, gameVersion, includeDlc, setIncludeDlc };
}

/** Step 2: 고정 포켓몬 상태 */
function useFixedPokemon() {
  const [fixedPokemon, setFixedPokemon] = useState<(Pokemon | null)[]>(
    Array(6).fill(null)
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number>(0);

  const handleSlotClick = useCallback((index: number) => {
    setActiveSlot(index);
    setModalOpen(true);
  }, []);

  const handlePokemonSelect = useCallback((pokemon: Pokemon) => {
    setFixedPokemon((prev) => {
      const updated = [...prev];
      updated[activeSlot] = pokemon;
      return updated;
    });
  }, [activeSlot]);

  const handleRemovePokemon = useCallback((index: number) => {
    setFixedPokemon((prev) => {
      const updated = [...prev];
      updated[index] = null;
      return updated;
    });
  }, []);

  const fixedPokemonIds = useMemo(
    () => fixedPokemon.filter((p): p is Pokemon => p !== null).map((p) => String(p.id)),
    [fixedPokemon]
  );

  const fixedPokemonList = useMemo(
    () => fixedPokemon.filter((p): p is Pokemon => p !== null),
    [fixedPokemon]
  );

  return {
    fixedPokemon,
    modalOpen,
    setModalOpen,
    activeSlot,
    handleSlotClick,
    handlePokemonSelect,
    handleRemovePokemon,
    fixedPokemonIds,
    fixedPokemonList,
  };
}

/** 포켓몬 목록 로드 상태 */
function usePokemonLoader(currentStep: number, selectedGameId: string | null, gameVersion: string | null) {
  const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
  const [pokemonLoading, setPokemonLoading] = useState(false);
  const [pokemonError, setPokemonError] = useState<string | null>(null);

  useEffect(() => {
    if (currentStep < 2 || !selectedGameId) return;

    async function fetchPokemon() {
      try {
        setPokemonLoading(true);
        setPokemonError(null);
        const params = gameVersion ? `?gameVersion=${gameVersion}` : '';
        const cacheKey = `pokemon-list-${gameVersion ?? 'all'}`;
        const data = await cachedFetch(cacheKey, async () => {
          const res = await fetch(`/api/pokemon${params}`);
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || '포켓몬 목록을 불러오지 못했습니다.');
          }
          return res.json();
        });
        setAllPokemon(data.pokemon);
      } catch (err) {
        setPokemonError(
          getClientErrorMessage(err, '알 수 없는 오류가 발생했습니다.')
        );
      } finally {
        setPokemonLoading(false);
      }
    }
    fetchPokemon();
  }, [currentStep, selectedGameId, gameVersion]);

  return { allPokemon, pokemonLoading, pokemonError };
}

/** 필터 옵션 상태 */
function useFilterOptions() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [excludeTradeEvolution, setExcludeTradeEvolution] = useState(true);
  const [excludeItemEvolution, setExcludeItemEvolution] = useState(true);
  const [includeStarters, setIncludeStarters] = useState(false);
  const [finalOnly, setFinalOnly] = useState(false);
  const [gen8Only, setGen8Only] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<PokemonType>>(() => new Set(ALL_TYPES));

  return {
    basicOpen, setBasicOpen,
    typeOpen, setTypeOpen,
    excludeTradeEvolution, setExcludeTradeEvolution,
    excludeItemEvolution, setExcludeItemEvolution,
    includeStarters, setIncludeStarters,
    finalOnly, setFinalOnly,
    gen8Only, setGen8Only,
    selectedTypes, setSelectedTypes,
  };
}

/** Step 3: 추천 결과 상태 */
function useRecommendations(
  gameVersion: string | null,
  fixedPokemonIds: string[],
  filters: {
    excludeTradeEvolution: boolean;
    excludeItemEvolution: boolean;
    includeStarters: boolean;
    finalOnly: boolean;
    gen8Only: boolean;
    selectedTypes: Set<PokemonType>;
  },
) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setRecommendLoading(true);
      setRecommendError(null);

      const slotsToFill = 6 - fixedPokemonIds.length;

      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixedPokemon: fixedPokemonIds,
          slotsToFill,
          filters: {
            excludeTradeEvolution: filters.excludeTradeEvolution,
            excludeItemEvolution: filters.excludeItemEvolution,
            includeStarters: filters.includeStarters,
            finalOnly: filters.finalOnly,
            gen8Only: filters.gen8Only,
            selectedTypes: Array.from(filters.selectedTypes),
            gameVersion: gameVersion ?? undefined,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '추천을 가져오지 못했습니다.');
      }

      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setRecommendError(
        getClientErrorMessage(err, '알 수 없는 오류가 발생했습니다.')
      );
    } finally {
      setRecommendLoading(false);
    }
  }, [gameVersion, fixedPokemonIds, filters.excludeTradeEvolution, filters.excludeItemEvolution, filters.includeStarters, filters.finalOnly, filters.gen8Only, filters.selectedTypes]);

  return { recommendations, recommendLoading, recommendError, fetchRecommendations };
}

/** 파티 저장 상태 */
function usePartySave(
  selectedGameId: string | null,
  fixedPokemonList: Pokemon[],
  recommendations: RecommendationItem[],
) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveParty = useCallback(async () => {
    const allPokemonIds = [
      ...fixedPokemonList.map((p) => p.id),
      ...recommendations.map((r) => r.pokemon.id),
    ];
    if (allPokemonIds.length === 0) return;

    const gameEntry = getGameById(selectedGameId ?? '');
    const gameId = selectedGameId || '';

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${gameEntry?.label ?? '파티'} 추천 파티`,
          pokemon_ids: allPokemonIds,
          story_point_id: null,
          game_id: gameId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '파티 저장에 실패했습니다.');
      }

      setSaveSuccess(true);
    } catch (err) {
      setSaveError(getClientErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [selectedGameId, fixedPokemonList, recommendations]);

  return { user, saving, saveSuccess, saveError, handleSaveParty };
}

/** 메인 커스텀 훅: 모든 추천 페이지 상태를 통합 관리 */
export function useRecommendState() {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const gameSelection = useGameSelection();

  // Step 2: 고정 포켓몬
  const fixedPokemonState = useFixedPokemon();

  // 포켓몬 목록 로드
  const pokemonLoader = usePokemonLoader(
    currentStep,
    gameSelection.selectedGameId,
    gameSelection.gameVersion,
  );

  // 필터 옵션
  const filterOptions = useFilterOptions();

  // Step 3: 추천 결과
  const recommendState = useRecommendations(
    gameSelection.gameVersion,
    fixedPokemonState.fixedPokemonIds,
    {
      excludeTradeEvolution: filterOptions.excludeTradeEvolution,
      excludeItemEvolution: filterOptions.excludeItemEvolution,
      includeStarters: filterOptions.includeStarters,
      finalOnly: filterOptions.finalOnly,
      gen8Only: filterOptions.gen8Only,
      selectedTypes: filterOptions.selectedTypes,
    },
  );

  // Step 진행 시 추천 요청 — ref 패턴으로 eslint-disable 제거 (#10)
  const fetchRecommendationsRef = useRef(recommendState.fetchRecommendations);
  fetchRecommendationsRef.current = recommendState.fetchRecommendations;

  useEffect(() => {
    if (currentStep === 3) {
      fetchRecommendationsRef.current();
    }
  }, [currentStep]);

  // 파티 저장
  const partySave = usePartySave(
    gameSelection.selectedGameId,
    fixedPokemonState.fixedPokemonList,
    recommendState.recommendations,
  );

  // 네비게이션
  const canGoNext = () => {
    if (currentStep === 1) return !!gameSelection.selectedGameId;
    if (currentStep === 2) return true;
    return false;
  };

  const goNext = () => {
    if (currentStep < 3) setCurrentStep((s) => s + 1);
  };

  const goPrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  return {
    currentStep,
    setCurrentStep,
    canGoNext,
    goNext,
    goPrev,

    // Game selection
    ...gameSelection,

    // Fixed pokemon
    ...fixedPokemonState,

    // Pokemon loader
    ...pokemonLoader,

    // Filter options
    ...filterOptions,

    // Recommendations
    ...recommendState,

    // Party save
    ...partySave,
  };
}
