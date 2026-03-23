'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users } from 'lucide-react';
import SharedPartyCard from '@/components/SharedPartyCard';
import type { SharedParty, SharedPartiesResponse } from '@/types/shared-party';
import { UI } from '@/lib/ui-tokens';
import { getClientErrorMessage } from '@/lib/error-utils';

const PAGE_SIZE = 12;

/** 갤러리 스켈레톤 */
function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={`${UI.pageBg} ${UI.border} p-4 animate-pulse`}>
          <div className="h-3 bg-slate-200 rounded w-2/3 mb-3" />
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="flex-1 aspect-square bg-slate-200 rounded-lg" />
            ))}
          </div>
          <div className="h-3 bg-slate-200 rounded w-3/4 mb-3" />
          <div className="h-6 bg-slate-200 rounded w-1/4 ml-auto" />
        </div>
      ))}
    </div>
  );
}

/** 빈 상태 */
function EmptyGallery() {
  return (
    <div className="text-center py-16">
      <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <h2 className="text-lg font-bold text-slate-700 mb-2">아직 공유된 파티가 없습니다</h2>
      <p className="text-sm text-slate-500">
        파티 상세 페이지에서 [공유하기] 버튼을 눌러 첫 파티를 공유해보세요!
      </p>
    </div>
  );
}

export default function CommunityPage() {
  const [parties, setParties] = useState<SharedParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchParties = useCallback(async (pageNum: number) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const res = await fetch(`/api/shared?page=${pageNum}&limit=${PAGE_SIZE}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '갤러리를 불러올 수 없습니다.');
      }

      const json: SharedPartiesResponse = await res.json();
      setParties(json.parties);
      setTotal(json.total);
      setPage(json.page);
    } catch (err) {
      setError(getClientErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchParties(1);
  }, [fetchParties]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchParties(newPage);
  };

  return (
    <div className={`min-h-screen ${UI.pageBg}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">커뮤니티 갤러리</h1>
          <p className="text-sm text-slate-500">
            다른 트레이너들이 공유한 파티를 구경해보세요
          </p>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
            <button
              onClick={() => fetchParties(page)}
              className="ml-2 underline hover:no-underline cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {loading && <GallerySkeleton />}

        {/* 갤러리 그리드 */}
        {!loading && parties.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {parties.map((party) => (
                <SharedPartyCard key={party.id} party={party} />
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1 || loadingMore}
                  className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  이전
                </button>

                {/* 페이지 번호 */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // 현재 페이지 주변 2개 + 처음/끝 표시
                    return p === 1 || p === totalPages || Math.abs(p - page) <= 2;
                  })
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push('ellipsis');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => handlePageChange(item)}
                        disabled={loadingMore}
                        className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                          item === page
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages || loadingMore}
                  className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  다음
                </button>

                {loadingMore && (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin ml-2" />
                )}
              </div>
            )}
          </>
        )}

        {/* 빈 상태 */}
        {!loading && !error && parties.length === 0 && <EmptyGallery />}
      </div>
    </div>
  );
}
