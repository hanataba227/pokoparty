'use client';

import { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Pokemon, ScoringBreakdown, DetailedReason } from '@/types/pokemon';
import { getFinalScore } from '@/lib/score-utils';
import { getSpriteUrl } from '@/lib/sprite';
import TypeBadge from './TypeBadge';
import { UI } from '@/lib/ui-tokens';

/** 카테고리별 아이콘/라벨 매핑 */
const REASON_LABELS: Record<DetailedReason['category'], { icon: string; label: string }> = {
  move: { icon: '⚔️', label: '기술' },
  evolution: { icon: '🔄', label: '진화' },
  coverage: { icon: '🎯', label: '커버리지' },
  tip: { icon: '💡', label: '팁' },
};

interface PokemonCardProps {
  pokemon: Pokemon;
  score?: ScoringBreakdown;
  detailedReasons?: DetailedReason[];
  isFixed?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

const PokemonCard = memo(function PokemonCard({ pokemon, score, detailedReasons, isFixed, compact, onClick }: PokemonCardProps) {
  const spriteUrl = getSpriteUrl(pokemon.id);
  const totalScore = score ? Math.round(getFinalScore(score)) : null;

  return (
    <div
      onClick={onClick}
      className={`relative bg-white border rounded-xl ${compact ? 'p-2 sm:p-3' : 'p-4'}
        hover:shadow-sm transition-all duration-200
        ${isFixed
          ? 'border-amber-400 ring-1 ring-amber-200'
          : `${UI.rowBorder} hover:border-indigo-300`
        }
        ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* 고정 포켓몬 뱃지 */}
      {isFixed && (
        <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          MY
        </div>
      )}

      {/* 포켓몬 이미지 + 이름 (클릭 시 도감 페이지로 이동) */}
      <Link href={`/pokemon/${pokemon.id}`} onClick={(e) => e.stopPropagation()}>
        <div className={`${compact ? 'w-12 h-12 sm:w-16 sm:h-16 mb-1.5' : 'w-20 h-20 mb-3'} mx-auto relative`}>
          <Image
            src={spriteUrl}
            alt={pokemon.name}
            width={compact ? 64 : 80}
            height={compact ? 64 : 80}
            className="w-full h-full object-contain"
            unoptimized
          />
        </div>
        <h3 className={`text-center font-bold text-slate-900 hover:text-indigo-600 transition-colors ${compact ? 'text-xs sm:text-sm' : 'text-lg'}`}>
          {pokemon.name}
        </h3>
      </Link>
      {!compact && (
        <p className="text-center text-slate-400 text-sm">
          #{String(pokemon.id).padStart(3, '0')}
        </p>
      )}

      {/* 타입 뱃지 */}
      <div className={`flex justify-center gap-1 ${compact ? 'mt-1' : 'gap-1.5 mt-2'}`}>
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>

      {/* 추천 점수 (compact에서는 총점만) */}
      {score && totalScore !== null && (
        compact ? (
          <div className="flex items-center justify-center gap-1 mt-1.5">
            <span className="text-orange-500 font-bold text-sm">{totalScore}</span>
            <span className="text-slate-400 text-[10px]">점</span>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <span className="text-orange-500 font-bold text-lg">{totalScore}</span>
              <span className="text-slate-400 text-xs">/ 100</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-500">
              <div className="flex justify-between">
                <span>전투적합도</span>
                <span className="font-medium">{score.combatFitness}</span>
              </div>
              <div className="flex justify-between">
                <span>입수시기</span>
                <span className="font-medium">{score.acquisition}</span>
              </div>
              <div className="flex justify-between">
                <span>자속화력</span>
                <span className="font-medium">{score.stabPower}</span>
              </div>
              <div className="flex justify-between">
                <span>기술폭</span>
                <span className="font-medium">{score.moveCoverage}</span>
              </div>
              <div className="flex justify-between">
                <span>진화용이성</span>
                <span className="font-medium">{score.evolutionEase}</span>
              </div>
            </div>

            {/* 상세 추천 이유 (진화/팁만 표시) */}
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
        )
      )}
    </div>
  );
});

export default PokemonCard;

/** 개별 상세 이유 행 렌더링 */
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
            {d.moveType && (
              <span className="ml-1 inline-flex align-middle">
                <TypeBadge type={d.moveType} size="sm" />
              </span>
            )}
            {d.movePower != null && d.movePower > 0 && (
              <span className="ml-1 text-slate-400">위력{d.movePower}</span>
            )}
            {d.learnLevel != null && (
              <span className="ml-1 text-indigo-500">Lv{d.learnLevel}</span>
            )}
          </span>
        ) : reason.category === 'evolution' && d?.evolutionChain ? (
          <span className="text-slate-600">
            {d.evolutionLevel != null && (
              <span className="font-medium text-indigo-500 mr-1">Lv{d.evolutionLevel}</span>
            )}
            <span>최종진화</span>
            <span className="ml-1 text-slate-400">({d.evolutionChain})</span>
          </span>
        ) : reason.category === 'coverage' && d?.coveredTypes && d.coveredTypes.length > 0 ? (
          <span className="text-slate-600">
            <span className="mr-1">유리한 상대:</span>
            <span className="inline-flex flex-wrap gap-0.5">
              {d.coveredTypes.map((t) => (
                <TypeBadge key={t} type={t} size="sm" />
              ))}
            </span>
          </span>
        ) : (
          <span className="text-slate-500">{reason.summary}</span>
        )}
      </div>
    </div>
  );
}
