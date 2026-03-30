'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import PartyDetailHeader from '@/components/PartyDetailHeader';
import PartyPokemonGrid from '@/components/PartyPokemonGrid';
import PartyAnalysisView from '@/components/PartyAnalysisView';
import PartyMemoEditor from '@/components/PartyMemoEditor';
import { UI } from '@/lib/ui-tokens';
import { getClientErrorMessage } from '@/lib/error-utils';

/** API 응답 타입 */
interface PartyDetailResponse {
  party: {
    id: string;
    name: string;
    pokemon_ids: number[];
    game_id: string;
    story_point_id: string | null;
    created_at: string;
    memo: string;
    source?: string;
  };
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
  } | null;
  pokemon_details: {
    id: number;
    name_ko: string;
    types: string[];
  }[];
}

/** 스켈레톤 UI */
function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/3" />
      <div className="h-4 bg-slate-200 rounded w-1/4" />
      <div className={`${UI.pageBg} ${UI.border} p-4`}>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-slate-200 rounded-lg" />
          ))}
        </div>
      </div>
      <div className={`${UI.pageBg} ${UI.border} p-4`}>
        <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
        <div className="h-2.5 bg-slate-200 rounded-full mb-3" />
        <div className="h-2.5 bg-slate-200 rounded-full mb-3" />
        <div className="h-2.5 bg-slate-200 rounded-full" />
      </div>
    </div>
  );
}

export default function PartyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partyId = params.id as string;

  const [data, setData] = useState<PartyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 파티 상세 조회
  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/parties/${partyId}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.replace('/login?redirect=/party/' + partyId);
            return;
          }
          if (res.status === 404) {
            throw new Error('파티를 찾을 수 없습니다.');
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '파티 정보를 불러올 수 없습니다.');
        }
        const json: PartyDetailResponse = await res.json();
        setData(json);
      } catch (err) {
        setError(getClientErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    if (partyId) fetchDetail();
  }, [partyId, router]);

  // 파티명 변경
  const handleNameChange = useCallback(async (newName: string) => {
    const res = await fetch(`/api/parties/${partyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {
      throw new Error('이름 변경에 실패했습니다.');
    }
    setData((prev) => prev ? {
      ...prev,
      party: { ...prev.party, name: newName },
    } : prev);
  }, [partyId]);

  // 삭제 처리
  const handleDelete = useCallback(async () => {
    if (deleting) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/parties/${partyId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('삭제에 실패했습니다.');
      }
      router.replace('/mypage');
    } catch (err) {
      setError(getClientErrorMessage(err));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [partyId, deleting, router]);

  return (
    <div className={`min-h-screen ${UI.pageBg}`}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 상단 내비게이션 */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/mypage"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            내 파티 목록
          </Link>

          {data && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center justify-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors cursor-pointer min-w-[4.5rem]"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          )}

          {showDeleteConfirm && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {deleting ? '삭제 중...' : '삭제 확인'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className={`px-3 py-1.5 text-sm font-medium ${UI.border} text-slate-600 ${UI.hoverBg} transition-colors cursor-pointer`}
              >
                취소
              </button>
            </div>
          )}
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* 로딩 스켈레톤 */}
        {loading && <DetailSkeleton />}

        {/* 정상 렌더링 */}
        {!loading && data && (
          <>
            <PartyDetailHeader
              name={data.party.name}
              grade={data.analysis?.grade}
              totalScore={data.analysis?.total_score ?? 0}
              gameId={data.party.game_id}
              createdAt={data.party.created_at}
              source={data.party.source}
              onNameChange={handleNameChange}
            />

            <PartyPokemonGrid pokemonDetails={data.pokemon_details} />

            {data.analysis && (
              <PartyAnalysisView analysis={data.analysis} />
            )}

            <PartyMemoEditor
              partyId={data.party.id}
              initialMemo={data.party.memo ?? ''}
            />
          </>
        )}

        {/* 데이터 없음 (에러도 없고 로딩도 아닌 경우) */}
        {!loading && !data && !error && (
          <div className="text-center py-12 text-slate-400">
            파티 정보를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
