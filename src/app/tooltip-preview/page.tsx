'use client';

import { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';

const SCORE_ITEMS = [
  { key: 'combatFitness', label: '전투적합도', value: 72, desc: '스탯 집중도, 스피드, 기술 매칭을 종합한 전투 능력' },
  { key: 'acquisition', label: '입수시기', value: 85, desc: '게임 초반에 얻을수록 높은 점수. 일찍 합류하면 키울 시간이 많아 유리' },
  { key: 'stabPower', label: '자속화력', value: 68, desc: '자신의 타입과 같은 기술(STAB)의 위력. 높을수록 강한 공격 가능' },
  { key: 'moveCoverage', label: '기술폭', value: 55, desc: '다양한 타입의 적을 상대할 수 있는 기술 커버리지' },
  { key: 'evolutionEase', label: '진화용이성', value: 90, desc: '최종 진화까지의 난이도. 레벨 진화는 쉽고, 통신 교환은 어려움' },
];

export default function TooltipPreviewPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">점수 항목 도움말 디자인 예시</h1>
        <p className="text-slate-500 mb-12">각 라벨에 마우스를 올려보세요.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* ===== 디자인 A: 밑줄 + 네이티브 title ===== */}
          <DesignCard
            title="A. 밑줄 점선 + title"
            description="가장 심플. 브라우저 기본 툴팁 사용. 커스텀 스타일 불가하지만 구현 비용 0."
          >
            <div className="space-y-1.5 text-[11px] text-slate-500">
              {SCORE_ITEMS.map((item) => (
                <div key={item.key} className="flex justify-between">
                  <span
                    className="border-b border-dotted border-slate-400 cursor-help"
                    title={item.desc}
                  >
                    {item.label}
                  </span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </DesignCard>

          {/* ===== 디자인 B: ? 아이콘 + CSS 툴팁 ===== */}
          <DesignCard
            title="B. ? 아이콘 + 말풍선"
            description="아이콘에 호버하면 커스텀 말풍선 표시. 도움말이 있다는 걸 명확히 알려줌."
          >
            <div className="space-y-1.5 text-[11px] text-slate-500">
              {SCORE_ITEMS.map((item) => (
                <div key={item.key} className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    {item.label}
                    <span className="relative group">
                      <HelpCircle className="w-3 h-3 text-slate-300 hover:text-indigo-500 transition-colors cursor-help" />
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5
                        hidden group-hover:block
                        w-48 px-2.5 py-2 rounded-lg
                        bg-slate-800 text-white text-[10px] leading-relaxed font-normal
                        shadow-lg z-50 pointer-events-none">
                        {item.desc}
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
          </DesignCard>

          {/* ===== 디자인 C: 라벨 호버 + 밑줄 애니메이션 ===== */}
          <DesignCard
            title="C. 라벨 호버 + 슬라이드"
            description="라벨 자체에 호버하면 아래쪽에 설명이 슬라이드. 아이콘 없이 깔끔."
          >
            <div className="space-y-1.5 text-[11px] text-slate-500">
              {SCORE_ITEMS.map((item) => (
                <div key={item.key} className="relative group">
                  <div className="flex justify-between items-center">
                    <span className="border-b border-transparent group-hover:border-indigo-400 transition-colors cursor-help">
                      {item.label}
                    </span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="overflow-hidden max-h-0 group-hover:max-h-16 transition-all duration-200 ease-out">
                    <p className="pt-1 pb-1.5 text-[10px] text-indigo-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </DesignCard>
        </div>

        {/* ===== 디자인 D: 상단 i 버튼 + 전체 설명 토글 ===== */}
        <div className="mt-12">
          <DesignCard
            title="D. 상단 도움말 버튼 + 전체 토글"
            description="항목 옆이 아니라, 점수 영역 상단에 하나의 도움말 버튼. 누르면 전체 설명이 한 번에 표시/숨김."
            wide
          >
            <DesignD />
          </DesignCard>
        </div>
      </div>
    </div>
  );
}

function DesignD() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-orange-500 font-bold text-lg">72</span>
          <span className="text-slate-400 text-xs">/ 100</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer
            ${open ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
        >
          <Info className="w-3 h-3" />
          점수 항목 설명
        </button>
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-500">
        {SCORE_ITEMS.map((item) => (
          <div key={item.key}>
            <div className="flex justify-between">
              <span>{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
            {open && (
              <p className="text-[10px] text-indigo-500 leading-relaxed mt-0.5 mb-1">
                {item.desc}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignCard({ title, description, children, wide }: {
  title: string;
  description: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`border border-slate-200 rounded-xl p-5 ${wide ? '' : ''}`}>
      <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-[11px] text-slate-400 mb-4">{description}</p>
      <div className="bg-slate-50 rounded-lg p-4">
        {children}
      </div>
    </div>
  );
}
