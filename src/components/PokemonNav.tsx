'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UI } from '@/lib/ui-tokens';
import { getSpriteUrl } from '@/lib/sprite';

interface NavEntry {
  id: number;
  name: string;
}

interface PokemonNavProps {
  prev: NavEntry | null;
  current: NavEntry;
  next: NavEntry | null;
}

function NavCell({ entry, isCurrent }: { entry: NavEntry | null; isCurrent?: boolean }) {
  if (!entry) return <td className={`border-r last:border-r-0 ${UI.rowBorder}`} />;

  const content = (
    <div className="flex items-center justify-center gap-2 py-2">
      <Image
        src={getSpriteUrl(entry.id)}
        alt={entry.name}
        width={isCurrent ? 40 : 32}
        height={isCurrent ? 40 : 32}
        className={`${isCurrent ? 'w-10 h-10' : 'w-8 h-8'} object-contain`}

      />
      <span className={`tabular-nums text-xs ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
        #{String(entry.id).padStart(4, '0')}
      </span>
      <span className={`text-sm ${isCurrent ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
        {entry.name}
      </span>
    </div>
  );

  const cellClass = `text-center border-r last:border-r-0 ${UI.rowBorder}`;

  if (isCurrent) {
    return <td className={cellClass}>{content}</td>;
  }

  return (
    <td className={cellClass}>
      <Link href={`/pokemon/${entry.id}`} className={`block ${UI.hoverBg} transition-colors`}>
        {content}
      </Link>
    </td>
  );
}

export default function PokemonNav({ prev, current, next }: PokemonNavProps) {
  return (
    <div className={`${UI.border} overflow-hidden`}>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className={`${UI.tableHeader} border-b ${UI.rowBorder}`}>
            <th colSpan={3} className="py-2 text-center text-sm font-bold text-slate-700">
              포켓몬 도감 순서
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <NavCell entry={prev} />
            <NavCell entry={current} isCurrent />
            <NavCell entry={next} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
