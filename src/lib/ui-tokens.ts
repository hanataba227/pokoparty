/**
 * UI 디자인 토큰 — 전역 스타일 상수
 * 스타일 변경 시 이 파일만 수정하면 전 페이지에 반영됩니다.
 */

export const UI = {
  /** 페이지 배경 */
  pageBg: 'bg-white',
  /** 카드/섹션 외곽 테두리 */
  border: 'border border-slate-300 rounded-lg',
  /** 테이블 헤더 배경 */
  tableHeader: 'bg-slate-100',
  /** 테이블 행 구분선 */
  rowBorder: 'border-slate-300',
  /** 테이블 내부 구분선 (얇은) */
  innerBorder: 'border-slate-100',
  /** 섹션 제목 */
  sectionTitle: 'text-lg font-bold text-slate-900 mb-2',
  /** hover 배경 */
  hoverBg: 'hover:bg-slate-50',
  /** 푸터/합계 배경 */
  footerBg: 'bg-slate-50',
} as const;
