'use client';

import { Lightbulb } from 'lucide-react';
import { UI } from '@/lib/ui-tokens';

interface CompareHighlightsProps {
  highlights: string[];
}

export default function CompareHighlights({ highlights }: CompareHighlightsProps) {
  if (highlights.length === 0) return null;

  return (
    <div className={`${UI.pageBg} rounded-2xl shadow-sm border ${UI.rowBorder} p-6`}>
      <h3 className="text-lg font-bold text-slate-900 mb-4">주요 차이점</h3>
      <div className="space-y-3">
        {highlights.map((text, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl"
          >
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
