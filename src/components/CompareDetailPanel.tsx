'use client';

import type { CompareResponse, AnalysisResult, PokemonType } from '@/types/pokemon';
import TypeBadge from './TypeBadge';
import { Shield, Swords } from 'lucide-react';
import { UI } from '@/lib/ui-tokens';

interface CompareDetailPanelProps {
  result: CompareResponse;
}

function TypeSection({ label, types, icon, bgClass }: {
  label: string;
  types: PokemonType[];
  icon: React.ReactNode;
  bgClass: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-sm font-semibold text-slate-700">{label}</h4>
        <span className="text-xs text-slate-400">({types.length})</span>
      </div>
      {types.length > 0 ? (
        <div className={`${bgClass} rounded-xl p-3`}>
          <div className="flex flex-wrap gap-1.5">
            {types.map((type) => (
              <TypeBadge key={type} type={type} size="md" />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">없음</p>
      )}
    </div>
  );
}

function AnalysisColumn({ label, analysis }: { label: string; analysis: AnalysisResult }) {
  return (
    <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6`}>
      <h3 className="text-base font-bold text-slate-900 mb-4">{label}</h3>
      <div className="space-y-4">
        <TypeSection
          label="약점 타입"
          types={analysis.weaknesses}
          icon={<Shield className="w-4 h-4 text-red-500" />}
          bgClass="bg-red-50"
        />
        <TypeSection
          label="내성 타입"
          types={analysis.resistances}
          icon={<Shield className="w-4 h-4 text-blue-500" />}
          bgClass="bg-blue-50"
        />
        <TypeSection
          label="커버리지 타입"
          types={analysis.coverage}
          icon={<Swords className="w-4 h-4 text-indigo-500" />}
          bgClass="bg-indigo-50"
        />
      </div>
    </div>
  );
}

export default function CompareDetailPanel({ result }: CompareDetailPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <AnalysisColumn label="파티 A 상세" analysis={result.partyA.analysis} />
      <AnalysisColumn label="파티 B 상세" analysis={result.partyB.analysis} />
    </div>
  );
}
