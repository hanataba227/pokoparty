'use client';

import type { PokemonType } from '@/types/pokemon';

/** 포켓몬 18타입 공식 컬러 매핑 */
const TYPE_COLORS: Record<PokemonType, string> = {
  노말: '#A8A77A',
  격투: '#C22E28',
  비행: '#A98FF3',
  독: '#A33EA1',
  땅: '#E2BF65',
  바위: '#B6A136',
  벌레: '#A6B91A',
  고스트: '#735797',
  강철: '#B7B7CE',
  불꽃: '#EE8130',
  물: '#6390F0',
  풀: '#7AC74C',
  전기: '#F7D02C',
  에스퍼: '#F95587',
  얼음: '#96D9D6',
  드래곤: '#6F35FC',
  악: '#705746',
  페어리: '#D685AD',
};

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
} as const;

interface TypeBadgeProps {
  type: PokemonType;
  size?: 'sm' | 'md' | 'lg';
}

export default function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const color = TYPE_COLORS[type];

  return (
    <span
      className={`inline-block rounded-full font-semibold text-white ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: color }}
    >
      {type}
    </span>
  );
}

export { TYPE_COLORS };
