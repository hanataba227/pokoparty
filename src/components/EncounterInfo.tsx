'use client';

import type { Encounter, EncounterRarity } from '@/types/pokemon';
import { UI } from '@/lib/ui-tokens';

interface EncounterInfoProps {
  encounters: Encounter[];
}

const RARITY_STYLES: Record<EncounterRarity, string> = {
  흔함: 'bg-green-100 text-green-700',
  보통: 'bg-yellow-100 text-yellow-700',
  드묾: 'bg-red-100 text-red-700',
};

const METHOD_LABELS: Record<string, string> = {
  야생: '🌿 야생',
  낚시: '🎣 낚시',
  교환: '🔄 교환',
  선물: '🎁 선물',
};

function formatLocationName(storyPointId: string): string {
  return storyPointId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** 비정상 levelRange 보정: [36, 3660] → [36, 60] */
function fixLevelRange(range: [number, number]): [number, number] {
  let [min, max] = range;
  if (max > 100) {
    // 뒤에서 2자리가 실제 max (3660→60, 2860→60, 4560→60)
    const lastTwo = max % 100;
    max = lastTwo > 0 ? lastTwo : max;
  }
  return [min, max];
}

export default function EncounterInfo({ encounters }: EncounterInfoProps) {
  if (!encounters || encounters.length === 0) {
    return <p className="text-sm text-slate-400">출현 정보 없음</p>;
  }

  // Group by storyPointId
  const grouped = encounters.reduce<Record<string, Encounter[]>>(
    (acc, enc) => {
      if (!acc[enc.storyPointId]) acc[enc.storyPointId] = [];
      acc[enc.storyPointId].push(enc);
      return acc;
    },
    {},
  );

  return (
    <div className={`${UI.border} overflow-hidden`}>
      {Object.entries(grouped).map(([locationId, locationEncounters], groupIdx) => (
        <div key={locationId} className={groupIdx > 0 ? `border-t ${UI.rowBorder}` : ''}>
          <div className={`${UI.tableHeader} px-3 py-1.5`}>
            <h4 className="text-sm font-bold text-slate-700">
              {formatLocationName(locationId)}
            </h4>
          </div>

          {locationEncounters.map((enc, idx) => (
            <div
              key={`${enc.storyPointId}-${enc.method}-${idx}`}
              className={`flex items-center gap-2 text-sm text-slate-600 px-3 py-1.5 ${
                idx < locationEncounters.length - 1 ? `border-b ${UI.innerBorder}` : ''
              }`}
            >
              <span className="shrink-0">
                {METHOD_LABELS[enc.method] ?? enc.method}
              </span>
              <span className="text-slate-300">·</span>
              <span className="tabular-nums">
                {(() => {
                  const [min, max] = fixLevelRange(enc.levelRange);
                  return `Lv.${min}–${max}`;
                })()}
              </span>
              <span className="ml-auto">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${RARITY_STYLES[enc.rarity]}`}
                >
                  {enc.rarity}
                </span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
