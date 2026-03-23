'use client';

import { useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
  sharedPartyId: string;
  initialLiked: boolean;
  initialCount: number;
  /** 컴팩트 모드 (카드용): 아이콘 + 숫자만 표시 */
  compact?: boolean;
}

export default function LikeButton({
  sharedPartyId,
  initialLiked,
  initialCount,
  compact = false,
}: LikeButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    // 카드 안에서 클릭 시 상위 이벤트 전파 방지
    e.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }
    if (loading) return;

    // 낙관적 업데이트
    const nextLiked = !liked;
    const nextCount = nextLiked ? count + 1 : count - 1;
    setLiked(nextLiked);
    setCount(nextCount);

    try {
      setLoading(true);
      const res = await fetch(`/api/shared/${sharedPartyId}/like`, {
        method: 'POST',
      });

      if (!res.ok) {
        // 롤백
        setLiked(liked);
        setCount(count);
        return;
      }

      const data = await res.json();
      setLiked(data.liked);
      setCount(data.like_count);
    } catch {
      // 롤백
      setLiked(liked);
      setCount(count);
    } finally {
      setLoading(false);
    }
  }, [sharedPartyId, liked, count, loading, user, router]);

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-1 text-sm transition-colors cursor-pointer ${
          liked
            ? 'text-red-500'
            : 'text-slate-400 hover:text-red-400'
        }`}
        aria-label={liked ? '좋아요 취소' : '좋아요'}
      >
        <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        <span className="text-xs font-medium">{count}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors duration-200 cursor-pointer ${
        liked
          ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50'
      }`}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
    >
      <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
      <span>{count}</span>
    </button>
  );
}
