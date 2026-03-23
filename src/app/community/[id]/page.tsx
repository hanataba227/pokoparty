'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import PartyPokemonGrid from '@/components/PartyPokemonGrid';
import PartyAnalysisView from '@/components/PartyAnalysisView';
import ImportPartyButton from '@/components/ImportPartyButton';
import LikeButton from '@/components/LikeButton';
import type { SharedPartyDetailResponse } from '@/types/shared-party';
import type { PartyGrade } from '@/types/pokemon';
import { getGradeColor, getGradeBgColor } from '@/lib/party-grade';
import { getGameById } from '@/lib/game-data';
import { UI } from '@/lib/ui-tokens';
import { getClientErrorMessage } from '@/lib/error-utils';
import { useAuth } from '@/contexts/AuthContext';

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

export default function SharedPartyDetailPage() {
  const params = useParams();
  const sharedId = params.id as string;
  const { user } = useAuth();

  const [data, setData] = useState<SharedPartyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/shared/${sharedId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('공유 파티를 찾을 수 없습니다.');
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '파티 정보를 불러올 수 없습니다.');
        }
        const json: SharedPartyDetailResponse = await res.json();
        setData(json);
      } catch (err) {
        setError(getClientErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    if (sharedId) fetchDetail();
  }, [sharedId]);

  const party = data?.party;
  const game = party ? getGameById(party.game_id) : null;
  const gameName = game ? `${game.label} (${game.generation}세대)` : party?.game_id ?? '';
  const grade = party?.grade as PartyGrade | undefined;

  const dateStr = party
    ? new Date(party.shared_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).replace(/\. /g, '.').replace(/\.$/, '')
    : '';

  // 본인이 공유한 파티인지 확인
  const isOwnParty = user && party?.user_id === user.id;

  return (
    <div className={`min-h-screen ${UI.pageBg}`}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 상단 내비게이션 */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/community"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            갤러리로 돌아가기
          </Link>
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
        {!loading && data && party && (
          <>
            {/* 헤더: 파티명 + 등급 + 작성자 정보 */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900 truncate">{party.party_name}</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {gameName} · {dateStr} 공유
                  </p>
                </div>

                {grade && (
                  <div className={`${getGradeBgColor(grade)} ${getGradeColor(grade)} px-3 py-2 rounded-xl text-center flex-shrink-0`}>
                    <div className="text-2xl font-black leading-none">{grade}</div>
                    <div className="text-xs opacity-75 mt-1">
                      {Math.round(party.total_score)}점
                    </div>
                  </div>
                )}
              </div>

              {/* 작성자 정보 + 좋아요 */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{party.display_name}</span>
                </div>
                <LikeButton
                  sharedPartyId={party.id}
                  initialLiked={party.is_liked === true}
                  initialCount={party.like_count ?? 0}
                />
              </div>
            </div>

            {/* 포켓몬 그리드 */}
            <PartyPokemonGrid pokemonDetails={data.pokemon_details} />

            {/* 분석 결과 */}
            <PartyAnalysisView
              analysis={{
                grade: party.grade,
                total_score: party.total_score,
                offense_score: party.offense_score,
                defense_score: party.defense_score,
                diversity_score: party.diversity_score,
                coverage: party.coverage,
                weaknesses: party.weaknesses,
                resistances: party.resistances,
                suggestions: [],
              }}
            />

            {/* 메모 (읽기전용) */}
            {party.memo && (
              <div className={`${UI.pageBg} ${UI.border} p-4`}>
                <h2 className={UI.sectionTitle}>메모 / 후기</h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {party.memo}
                </p>
              </div>
            )}

            {/* 내 파티에 저장하기 — 로그인 유저 + 본인 파티가 아닌 경우 */}
            {user && !isOwnParty && (
              <ImportPartyButton
                sharedPartyId={party.id}
                originalGameId={party.game_id}
                isImported={party.is_imported === true}
              />
            )}
          </>
        )}

        {/* 데이터 없음 */}
        {!loading && !data && !error && (
          <div className="text-center py-12 text-slate-400">
            파티 정보를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
