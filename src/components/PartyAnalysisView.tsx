'use client';

import type { PartyGrade, PokemonType } from '@/types/pokemon';
import { getGradeColor } from '@/lib/party-grade';
import TypeBadge from '@/components/TypeBadge';
import { Lightbulb } from 'lucide-react';
import { UI } from '@/lib/ui-tokens';

interface PartyAnalysisViewProps {
  analysis: {
    grade: string;
    total_score: number;
    offense_score: number;
    defense_score: number;
    diversity_score: number;
    coverage: string[];
    weaknesses: string[];
    resistances: string[];
    suggestions: string[];
  };
}

/** 점수 바 컴포넌트 */
function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{Math.round(score)}</span>
      </div>
      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

/** 타입 태그 목록 */
function TypeTagList({ types, emptyText }: { types: string[]; emptyText: string }) {
  if (types.length === 0) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((type) => (
        <TypeBadge key={type} type={type as PokemonType} size="sm" />
      ))}
    </div>
  );
}

export default function PartyAnalysisView({ analysis }: PartyAnalysisViewProps) {
  const grade = analysis.grade as PartyGrade;

  return (
    <div className="space-y-4 mb-6">
      {/* 타입 분석 + 점수 상세: 좌우 2컬럼 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 왼쪽: 타입 커버리지 / 약점 / 내성 */}
        <div className={`${UI.pageBg} ${UI.border} p-4`}>
          <h2 className={UI.sectionTitle}>타입 분석</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">공격 커버리지</h3>
              <TypeTagList types={analysis.coverage} emptyText="커버리지 타입이 없습니다." />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-600 mb-2">약점</h3>
              <TypeTagList types={analysis.weaknesses} emptyText="뚜렷한 약점이 없습니다." />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-600 mb-2">내성</h3>
              <TypeTagList types={analysis.resistances} emptyText="뚜렷한 내성이 없습니다." />
            </div>
          </div>
        </div>

        {/* 오른쪽: 점수 바 + 종합 점수 */}
        <div className={`${UI.pageBg} ${UI.border} p-4`}>
          <h2 className={UI.sectionTitle}>점수 상세</h2>
          <div className="space-y-3 mb-4">
            <ScoreBar label="공격 커버리지" score={analysis.offense_score} color="bg-indigo-500" />
            <ScoreBar label="방어 밸런스" score={analysis.defense_score} color="bg-red-400" />
            <ScoreBar label="타입 다양성" score={analysis.diversity_score} color="bg-emerald-500" />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">종합</span>
            <span className={`text-lg font-bold ${getGradeColor(grade)}`}>
              {grade}등급 ({Math.round(analysis.total_score)}점)
            </span>
          </div>
        </div>
      </div>

      {/* 개선 제안 */}
      {analysis.suggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h2 className="text-lg font-bold text-amber-800 mb-2">개선 제안</h2>
          <ul className="space-y-2">
            {analysis.suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
