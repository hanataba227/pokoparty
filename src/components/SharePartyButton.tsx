'use client';

import { useState, useCallback } from 'react';
import { Share2, Check, Loader2, X, AlertTriangle } from 'lucide-react';
import { getClientErrorMessage } from '@/lib/error-utils';

interface SharePartyButtonProps {
  partyId: string;
  /** 이미 공유된 파티인지 여부 (source_party_id 기준) */
  isAlreadyShared?: boolean;
  /** 메모가 있는지 여부 (공유 시 메모 포함 안내용) */
  hasMemo?: boolean;
}

export default function SharePartyButton({ partyId, isAlreadyShared = false, hasMemo = false }: SharePartyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(isAlreadyShared);
  const [error, setError] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    if (sharing || shared) return;
    try {
      setSharing(true);
      setError(null);

      const res = await fetch('/api/shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ party_id: partyId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '공유에 실패했습니다.');
      }

      setShared(true);
      setShowModal(false);
    } catch (err) {
      setError(getClientErrorMessage(err));
    } finally {
      setSharing(false);
    }
  }, [partyId, sharing, shared]);

  // 이미 공유됨 상태
  if (shared) {
    return (
      <div className="mt-6 flex justify-center">
        <div className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-4 h-4" />
          공유됨
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 공유 버튼 */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          <Share2 className="w-4 h-4" />
          공유하기
        </button>
      </div>

      {/* 공유 확인 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h2 id="share-modal-title" className="text-xl font-bold text-slate-900">
                파티 공유
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 안내 메시지 */}
            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-700 leading-relaxed">
                이 파티를 커뮤니티 갤러리에 공유합니다.
                공유된 파티는 모든 사용자가 볼 수 있습니다.
              </p>

              {hasMemo && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    작성한 메모/후기도 함께 공유됩니다.
                  </p>
                </div>
              )}

              <ul className="text-sm text-slate-600 space-y-1.5 pl-4">
                <li className="list-disc">공유 시점의 파티 정보가 스냅샷으로 저장됩니다</li>
                <li className="list-disc">원본 파티를 수정해도 공유된 파티에는 영향이 없습니다</li>
                <li className="list-disc">공유 후에도 언제든 취소할 수 있습니다</li>
              </ul>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={sharing}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {sharing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    공유 중...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    공유하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
