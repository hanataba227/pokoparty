'use client';

const SCORE_ITEMS = [
  { label: '전투적합도', desc: '종족값 분포, 스피드, 기술 분포를 종합한 전투 능력' },
  { label: '입수시기', desc: '게임 초반에 얻을수록 높은 점수' },
  { label: '자속화력', desc: '종족값 분포에 맞는 기술을 배울 수 있으면 높은 점수' },
  { label: '기술폭', desc: '다양한 타입의 적을 상대할 수 있으면 높은 점수' },
  { label: '진화용이성', desc: '레벨 진화, 통신 교환 등 최종 진화까지의 난이도' },
];

export default function ScoreGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">항목 안내</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {SCORE_ITEMS.map((item) => (
            <div key={item.label}>
              <div className="text-sm font-bold text-slate-800 mb-1">{item.label}</div>
              <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-400 leading-relaxed">
            각 항목은 0~100점으로 평가되며, 가중치를 적용해 종합 점수를 산출합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
