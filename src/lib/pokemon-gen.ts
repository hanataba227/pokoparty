/**
 * 세대 범위 및 세대 판별 유틸리티
 * fs 미사용 — 클라이언트/서버 모두 import 가능
 */

/** 세대별 전국도감 번호 범위 */
export const GEN_RANGES: [number, number][] = [
  [1, 151], [152, 251], [252, 386], [387, 493],
  [494, 649], [650, 721], [722, 809], [810, 905],
  [906, 1025],
];

/** 전국도감 번호 → 세대 */
export function getGeneration(id: number): number {
  for (let i = 0; i < GEN_RANGES.length; i++) {
    if (id >= GEN_RANGES[i][0] && id <= GEN_RANGES[i][1]) return i + 1;
  }
  return GEN_RANGES.length;
}
