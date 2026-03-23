'use client';

import { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Pokemon, ScoringBreakdown, DetailedReason } from '@/types/pokemon';
import { getFinalScore } from '@/lib/score-utils';
import { getSpriteUrl } from '@/lib/sprite';
import TypeBadge from './TypeBadge';
import { HelpCircle } from 'lucide-react';
import { UI } from '@/lib/ui-tokens';

/** 점수 항목 설명 */
const SCORE_DESCRIPTIONS: Record<string, string> = {
  combatFitness: '스탯 집중도, 스피드, 기술 매칭을 종합한 전투 능력',
  acquisition: '게임 초반에 얻을수록 높은 점수. 일찍 합류하면 키울 시간이 많아 유리',
  stabPower: '자신의 타입과 같은 기술(STAB)의 위력. 높을수록 강한 공격 가능',
  moveCoverage: '다양한 타입의 적을 상대할 수 있는 기술 커버리지',
  evolutionEase: '최종 진화까지의 난이도. 레벨 진화는 쉽고, 통신 교환은 어려움',
};

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
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
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

      {/* 포켓몬 이미지 + 이름 (onClick이 없으면 도감 페이지로 이동, 있으면 선택 동작) */}
      {onClick ? (
        <>
          <div className={`${compact ? 'w-12 h-12 sm:w-16 sm:h-16 mb-1.5' : 'w-20 h-20 mb-3'} mx-auto relative`}>
            <Image
              src={spriteUrl}
              alt={pokemon.name}
              width={compact ? 64 : 80}
              height={compact ? 64 : 80}
              className="w-full h-full object-contain"

            />
          </div>
          <h3 className={`text-center font-bold text-slate-900 ${compact ? 'text-xs sm:text-sm' : 'text-lg'}`}>
            {pokemon.name}
          </h3>
        </>
      ) : (
        <Link href={`/pokemon/${pokemon.id}`}>
          <div className={`${compact ? 'w-12 h-12 sm:w-16 sm:h-16 mb-1.5' : 'w-20 h-20 mb-3'} mx-auto relative`}>
            <Image
              src={spriteUrl}
              alt={pokemon.name}
              width={compact ? 64 : 80}
              height={compact ? 64 : 80}
              className="w-full h-full object-contain"

            />
          </div>
          <h3 className={`text-center font-bold text-slate-900 hover:text-indigo-600 transition-colors ${compact ? 'text-xs sm:text-sm' : 'text-lg'}`}>
            {pokemon.name}
          </h3>
        </Link>
      )}
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
              {([
                { key: 'combatFitness', label: '전투적합도', value: score.combatFitness },
                { key: 'acquisition', label: '입수시기', value: score.acquisition },
                { key: 'stabPower', label: '자속화력', value: score.stabPower },
                { key: 'moveCoverage', label: '기술폭', value: score.moveCoverage },
                { key: 'evolutionEase', label: '진화용이성', value: score.evolutionEase },
              ] as const).map((item) => (
                <div key={item.key} className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    {item.label}
                    <span className="relative group/tip">
                      <HelpCircle className="w-3 h-3 text-slate-300 hover:text-indigo-500 transition-colors cursor-help" />
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5
                        hidden group-hover/tip:block
                        w-44 px-2.5 py-2 rounded-lg
                        bg-slate-800 text-white text-[10px] leading-relaxed font-normal
                        shadow-lg z-50 pointer-events-none">
                        {SCORE_DESCRIPTIONS[item.key]}
                        <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
                          border-l-4 border-r-4 border-t-4
                          border-l-transparent border-r-transparent border-t-slate-800" />
                      </span>
                    </span>
                  </span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
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
