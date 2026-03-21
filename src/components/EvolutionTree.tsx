'use client';

import type { Evolution } from '@/types/pokemon';
import { UI } from '@/lib/ui-tokens';
import { getSpriteUrl } from '@/lib/sprite';
import Image from 'next/image';
import Link from 'next/link';

interface EvolutionTreeProps {
  evolutions: Evolution[] | undefined;
  currentPokemonId: number;
  allPokemon: { id: number; name: string; evolutions?: Evolution[] }[];
}

interface StageInfo {
  id: number;
  name: string;
}

interface ArrowInfo {
  method: string;
  level?: number;
  item?: string;
}

export default function EvolutionTree({
  evolutions: _evolutions,
  currentPokemonId,
  allPokemon,
}: EvolutionTreeProps) {
  const getName = (id: number) =>
    allPokemon.find((p) => p.id === id)?.name ?? `#${id}`;

  const getEvolutions = (id: number) =>
    allPokemon.find((p) => p.id === id)?.evolutions;

  // 기저 포켓몬(1단계) 찾기: 누가 현재 포켓몬으로 진화하는지 역추적
  function findBaseId(targetId: number): number {
    const preEvo = allPokemon.find((p) =>
      p.evolutions?.some((e) => e.to === targetId)
    );
    if (preEvo) return findBaseId(preEvo.id); // 더 이전 단계 탐색
    return targetId;
  }

  // 기저부터 정방향으로 체인 구축
  const stages: StageInfo[] = [];
  const arrows: ArrowInfo[] = [];

  const baseId = findBaseId(currentPokemonId);
  let currentId: number | null = baseId;

  while (currentId !== null) {
    stages.push({ id: currentId, name: getName(currentId) });
    const evoList = getEvolutions(currentId);
    if (evoList && evoList.length > 0) {
      const evo = evoList[0]; // 첫 번째 진화 경로
      arrows.push({ method: evo.method, level: evo.level, item: evo.item });
      currentId = evo.to;
      // 무한 루프 방지
      if (stages.some((s) => s.id === currentId)) break;
    } else {
      currentId = null;
    }
  }

  if (stages.length <= 1) {
    return <p className="text-sm text-slate-400">진화 정보 없음</p>;
  }

  const formatCondition = (arrow: ArrowInfo) => {
    if (arrow.level) return `Lv.${arrow.level}`;
    if (arrow.item) return arrow.item;
    return arrow.method;
  };

  return (
    <div className={`${UI.border} overflow-hidden h-full flex items-center justify-center`}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-center overflow-x-auto">
          {stages.map((stage, idx) => (
            <div key={stage.id} className="flex items-center shrink-0">
              {/* 화살표 + 조건 */}
              {idx > 0 && (
                <div className="flex flex-col items-center mx-4">
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatCondition(arrows[idx - 1])}
                  </span>
                  <span className="text-slate-300 text-xl">→</span>
                </div>
              )}

              {/* 포켓몬 스테이지 */}
              <Link
                href={`/pokemon/${stage.id}`}
                className={`flex flex-col items-center p-2 rounded-lg border-2 transition-colors hover:border-indigo-300 ${
                  stage.id === currentPokemonId
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-300'
                }`}
              >
                <div className="w-16 h-16 relative">
                  <Image
                    src={getSpriteUrl(stage.id)}
                    alt={stage.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
                <span className="text-xs font-medium text-slate-900 mt-1">
                  {stage.name}
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
