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
  /** pokedex-all.json 기반 이름 맵 (게임 미수록 포켓몬 이름 fallback) */
  nameMap?: Record<number, string>;
}

interface StageInfo {
  id: number;
  name: string;
}

interface BranchInfo {
  target: StageInfo;
  method: string;
  level?: number;
  item?: string;
}

/** 진화 트리의 한 단계 (기저 포켓몬 + 분기 진화 목록) */
interface TreeNode {
  pokemon: StageInfo;
  branches: {
    condition: { method: string; level?: number; item?: string };
    next: TreeNode;
  }[];
}

export default function EvolutionTree({
  evolutions: _evolutions,
  currentPokemonId,
  allPokemon,
  nameMap,
}: EvolutionTreeProps) {
  // 이슈 #20: 한글 이름 폴백 체인 — allPokemon → nameMap → #id
  const getName = (id: number): string => {
    const found = allPokemon.find((p) => p.id === id);
    if (found?.name) return found.name;
    if (nameMap?.[id]) return nameMap[id];
    return `#${id}`;
  };

  const getEvolutions = (id: number) =>
    allPokemon.find((p) => p.id === id)?.evolutions;

  // 기저 포켓몬(1단계) 찾기: 누가 현재 포켓몬으로 진화하는지 역추적
  function findBaseId(targetId: number): number {
    const preEvo = allPokemon.find((p) =>
      p.evolutions?.some((e) => e.to === targetId)
    );
    if (preEvo) return findBaseId(preEvo.id);
    return targetId;
  }

  // 트리 구축 (분기 진화 지원)
  function buildTree(id: number, visited: Set<number>): TreeNode {
    const node: TreeNode = {
      pokemon: { id, name: getName(id) },
      branches: [],
    };

    if (visited.has(id)) return node;
    visited.add(id);

    const evoList = getEvolutions(id);
    if (evoList && evoList.length > 0) {
      for (const evo of evoList) {
        if (!visited.has(evo.to)) {
          node.branches.push({
            condition: { method: evo.method, level: evo.level, item: evo.item },
            next: buildTree(evo.to, visited),
          });
        }
      }
    }

    return node;
  }

  const baseId = findBaseId(currentPokemonId);
  const tree = buildTree(baseId, new Set());

  // 트리가 단일 노드(진화 없음)인지 확인
  function countNodes(node: TreeNode): number {
    return 1 + node.branches.reduce((sum, b) => sum + countNodes(b.next), 0);
  }

  if (countNodes(tree) <= 1) {
    return <p className="text-sm text-slate-400">진화 정보 없음</p>;
  }

  const formatCondition = (cond: { method: string; level?: number; item?: string }) => {
    if (cond.level) return `Lv.${cond.level}`;
    if (cond.item) return cond.item;
    return cond.method;
  };

  // 포켓몬 카드 렌더링
  const renderPokemonCard = (stage: StageInfo) => {
    const displayName = stage.name || getName(stage.id);
    return (
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
            alt={displayName}
            width={64}
            height={64}
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-xs font-medium text-slate-900 mt-1">
          {displayName}
        </span>
      </Link>
    );
  };

  // 화살표 + 조건 렌더링
  const renderArrow = (cond: { method: string; level?: number; item?: string }) => (
    <div className="flex flex-col items-center mx-3">
      <span className="text-xs text-slate-500 whitespace-nowrap">
        {formatCondition(cond)}
      </span>
      <span className="text-slate-300 text-xl">&rarr;</span>
    </div>
  );

  // 분기가 있는지 재귀적으로 확인
  function hasBranch(node: TreeNode): boolean {
    if (node.branches.length > 1) return true;
    return node.branches.some((b) => hasBranch(b.next));
  }

  // 분기 없는 선형 체인: 기존 가로 레이아웃 유지
  if (!hasBranch(tree)) {
    const stages: StageInfo[] = [];
    const arrows: { method: string; level?: number; item?: string }[] = [];
    let current: TreeNode | null = tree;

    while (current) {
      stages.push(current.pokemon);
      if (current.branches.length > 0) {
        arrows.push(current.branches[0].condition);
        current = current.branches[0].next;
      } else {
        current = null;
      }
    }

    return (
      <div className={`${UI.border} overflow-hidden h-full flex items-center justify-center`}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-center overflow-x-auto">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center shrink-0">
                {idx > 0 && renderArrow(arrows[idx - 1])}
                {renderPokemonCard(stage)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 분기 진화가 있는 경우: 기저 → 화살표 → 분기 목록
  // 재귀적으로 트리 렌더링
  function renderTree(node: TreeNode): React.ReactNode {
    if (node.branches.length === 0) {
      return (
        <div className="flex items-center shrink-0">
          {renderPokemonCard(node.pokemon)}
        </div>
      );
    }

    if (node.branches.length === 1) {
      return (
        <div className="flex items-center shrink-0">
          {renderPokemonCard(node.pokemon)}
          {renderArrow(node.branches[0].condition)}
          {renderTree(node.branches[0].next)}
        </div>
      );
    }

    // 분기 진화: 이브이처럼 많은 경우(5개 이상) 2열 그리드, 그 외 세로 나열
    const useTwoColGrid = node.branches.length >= 5;

    return (
      <div className="flex items-start shrink-0">
        <div className="flex items-center self-center">
          {renderPokemonCard(node.pokemon)}
        </div>

        <div className="flex flex-col items-center mx-3 self-center">
          <span className="text-slate-300 text-xl">&rarr;</span>
        </div>

        <div
          className={
            useTwoColGrid
              ? 'grid grid-cols-2 gap-2'
              : 'flex flex-col gap-2'
          }
        >
          {node.branches.map((branch) => (
            <div key={branch.next.pokemon.id} className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {formatCondition(branch.condition)}
                </span>
              </div>
              {renderTree(branch.next)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${UI.border} overflow-hidden h-full flex items-center justify-center`}>
      <div className="px-4 py-4 overflow-x-auto">
        {renderTree(tree)}
      </div>
    </div>
  );
}
