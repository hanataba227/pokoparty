'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProfileSection from '@/components/ProfileSection';
import SavedPartyList from '@/components/SavedPartyList';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import EmptyState from '@/components/EmptyState';
import type { SavedPartyWithGrade } from '@/components/SavedPartyList';
import { UI } from '@/lib/ui-tokens';
import { getClientErrorMessage } from '@/lib/error-utils';

interface PartiesResponse {
  parties: SavedPartyWithGrade[];
  total: number;
  page: number;
  limit: number;
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`${UI.pageBg} ${UI.border} p-4 shadow-sm animate-pulse`}>
          <div className="h-5 bg-slate-200 rounded w-2/3 mb-3" />
          <div className="grid grid-cols-3 gap-1 mb-3">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="aspect-square bg-slate-200 rounded-lg" />
            ))}
          </div>
          <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
          <div className="h-8 bg-slate-200 rounded mt-3" />
        </div>
      ))}
    </div>
  );
}

export default function MyPage() {
  const { user, loading: authLoading, deleteAccount } = useAuth();
  const router = useRouter();
  const [parties, setParties] = useState<SavedPartyWithGrade[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingParties, setLoadingParties] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchParties = useCallback(async (page: number) => {
    setLoadingParties(true);
    setError('');
    try {
      const res = await fetch(`/api/parties?page=${page}&limit=10`);
      if (!res.ok) {
        if (res.status === 401) {
          router.replace('/login?redirect=/mypage');
          return;
        }
        throw new Error('파티 목록을 불러올 수 없습니다.');
      }
      const json: PartiesResponse = await res.json();
      setParties(json.parties);
      setTotalCount(json.total);
      setCurrentPage(json.page);
    } catch (err) {
      setError(getClientErrorMessage(err, '알 수 없는 오류가 발생했습니다.'));
    } finally {
      setLoadingParties(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/mypage');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchParties(currentPage);
    }
  }, [user, currentPage, fetchParties]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    router.replace('/');
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/parties/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error('삭제에 실패했습니다.');
    }
    // Refresh list
    await fetchParties(currentPage);
  };

  // Loading skeleton
  if (authLoading) {
    return (
      <div className="py-8 space-y-6">
        <div className={`${UI.pageBg} ${UI.border} p-6 shadow-sm animate-pulse`}>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-slate-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-200 rounded w-48" />
              <div className="h-3 bg-slate-200 rounded w-36" />
            </div>
          </div>
        </div>
        <SkeletonCards />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="py-8 space-y-6">
      <ProfileSection user={user} onDeleteAccount={() => setShowDeleteModal(true)} />

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loadingParties ? (
        <SkeletonCards />
      ) : parties.length === 0 && currentPage === 1 ? (
        <EmptyState />
      ) : (
        <SavedPartyList
          parties={parties}
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onDelete={handleDelete}
        />
      )}

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        confirmText={user.user_metadata?.display_name || user.email?.split('@')[0] || ''}
      />
    </div>
  );
}
