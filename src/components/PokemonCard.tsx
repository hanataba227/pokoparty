'use client';

import Image from 'next/image';
import type { Pokemon, ScoringBreakdown } from '@/types/pokemon';
import { getFinalScore } from '@/lib/score-utils';
import { getSpriteUrl } from '@/lib/sprite';
import TypeBadge from './TypeBadge';

interface PokemonCardProps {
  pokemon: Pokemon;
  score?: ScoringBreakdown;
  isFixed?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export default function PokemonCard({ pokemon, score, isFixed, compact, onClick }: PokemonCardProps) {
  const spriteUrl = getSpriteUrl(pokemon.id);
  const totalScore = score ? Math.round(getFinalScore(score)) : null;

  return (
    <div
      onClick={onClick}
      className={`relative bg-white border rounded-xl ${compact ? 'p-2 sm:p-3' : 'p-4'}
        hover:shadow-sm transition-all duration-200
        ${isFixed
          ? 'border-amber-400 ring-1 ring-amber-200'
          : 'border-slate-200 hover:border-indigo-300'
        }
        ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* 고정 포켓몬 뱃지 */}
      {isFixed && (
        <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          MY
        </div>
      )}

      {/* 포켓몬 이미지 */}
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

      {/* 이름 + 번호 */}
      <h3 className={`text-center font-bold text-slate-900 ${compact ? 'text-xs sm:text-sm' : 'text-lg'}`}>
        {pokemon.name}
      </h3>
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

      {/* 역할 */}
      {!compact && (
        <p className="text-center text-indigo-600 text-xs font-medium mt-2">
          {pokemon.role}
        </p>
      )}

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
                <span>타입 커버리지</span>
                <span className="font-medium">{score.typeCoverage}</span>
              </div>
              <div className="flex justify-between">
                <span>등장 시점</span>
                <span className="font-medium">{score.availability}</span>
              </div>
              <div className="flex justify-between">
                <span>레벨업 속도</span>
                <span className="font-medium">{score.levelUpSpeed}</span>
              </div>
              <div className="flex justify-between">
                <span>기술 습득</span>
                <span className="font-medium">{score.movePool}</span>
              </div>
              <div className="flex justify-between">
                <span>진화 용이성</span>
                <span className="font-medium">{score.evolutionEase}</span>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
