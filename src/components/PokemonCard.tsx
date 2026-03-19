'use client';

import Image from 'next/image';
import type { Pokemon, ScoringBreakdown } from '@/types/pokemon';
import TypeBadge from './TypeBadge';

interface PokemonCardProps {
  pokemon: Pokemon;
  score?: ScoringBreakdown;
  isFixed?: boolean;
  onClick?: () => void;
}

/** 스코어 총점 계산 (가중치 반영) */
function calculateTotalScore(score: ScoringBreakdown): number {
  return Math.round(
    score.typeCoverage * 0.25 +
    score.availability * 0.25 +
    score.levelUpSpeed * 0.15 +
    score.movePool * 0.20 +
    score.evolutionEase * 0.15
  );
}

export default function PokemonCard({ pokemon, score, isFixed, onClick }: PokemonCardProps) {
  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
  const totalScore = score ? calculateTotalScore(score) : null;

  return (
    <div
      onClick={onClick}
      className={`relative bg-white border rounded-xl p-4
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
      <div className="w-20 h-20 mx-auto mb-3 relative">
        <Image
          src={spriteUrl}
          alt={pokemon.name}
          width={80}
          height={80}
          className="w-full h-full object-contain"
          unoptimized
        />
      </div>

      {/* 이름 + 번호 */}
      <h3 className="text-center font-bold text-slate-900 text-lg">
        {pokemon.name}
      </h3>
      <p className="text-center text-slate-400 text-sm">
        #{String(pokemon.id).padStart(3, '0')}
      </p>

      {/* 타입 뱃지 */}
      <div className="flex justify-center gap-1.5 mt-2">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>

      {/* 역할 */}
      <p className="text-center text-indigo-600 text-xs font-medium mt-2">
        {pokemon.role}
      </p>

      {/* 추천 점수 + 세부 점수 (score가 있을 때만) */}
      {score && totalScore !== null && (
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
      )}
    </div>
  );
}
