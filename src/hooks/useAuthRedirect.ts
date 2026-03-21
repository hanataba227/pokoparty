'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 인증 페이지 공통 훅: 리다이렉트 처리 + 로딩/인증 상태 반환.
 * 이미 로그인된 사용자는 redirect 파라미터 경로로 이동한다.
 */
export function useAuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // 오픈 리다이렉트 방지: 상대경로만 허용, "//"로 시작하면 차단
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirect);
    }
  }, [user, authLoading, router, redirect]);

  return { router, user, authLoading, redirect };
}
