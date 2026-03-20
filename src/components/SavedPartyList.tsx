'use client';

import SavedPartyCard from '@/components/SavedPartyCard';
import EmptyState from '@/components/EmptyState';
import type { SavedParty } from '@/types/pokemon';

interface SavedPartyListProps {
  parties: SavedParty[];
  totalCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onDelete: (id: string) => Promise<void>;
}

const PAGE_SIZE = 10;

export default function SavedPartyList({
  parties,
  totalCount,
  currentPage,
  onPageChange,
  onDelete,
}: SavedPartyListProps) {
  if (parties.length === 0 && currentPage === 1) {
    return <EmptyState />;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          저장한 파티 <span className="text-indigo-600">({totalCount})</span>
        </h2>
      </div>

      {/* Party Grid - responsive 1/2/3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {parties.map((party) => (
          <SavedPartyCard key={party.id} party={party} onDelete={onDelete} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                page === currentPage
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
