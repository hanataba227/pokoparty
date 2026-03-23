'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/AuthContext';
import { UI } from '@/lib/ui-tokens';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
  </div>
);

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [checkedName, setCheckedName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 이미 닉네임이 설정된 유저는 홈으로, 미인증 유저는 로그인으로 리다이렉트
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.user_metadata?.display_name) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || user.user_metadata?.display_name) {
    return <LoadingSpinner />;
  }

  const checkNickname = async () => {
    const name = displayName.trim();
    if (!name) {
      setError('닉네임을 입력해주세요.');
      return;
    }
    if (name.length < 2 || name.length > 20) {
      setError('닉네임은 2~20자여야 합니다.');
      return;
    }

    setNicknameStatus('checking');
    setError('');
    try {
      const res = await fetch(`/api/account/check-nickname?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '확인에 실패했습니다.');
        setNicknameStatus('idle');
        return;
      }
      setCheckedName(name);
      if (data.available) {
        setNicknameStatus('available');
      } else {
        setNicknameStatus('taken');
        setError('이미 사용 중인 닉네임입니다.');
      }
    } catch {
      setError('확인에 실패했습니다.');
      setNicknameStatus('idle');
    }
  };

  const handleNicknameChange = (value: string) => {
    setDisplayName(value);
    if (nicknameStatus !== 'idle') {
      setNicknameStatus('idle');
      setCheckedName('');
    }
    setError('');
  };

  const handleSubmit = async () => {
    const name = displayName.trim();
    if (!name) {
      setError('닉네임을 입력해주세요.');
      return;
    }
    if (nicknameStatus !== 'available' || checkedName !== name) {
      setError('닉네임 중복 확인을 해주세요.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const supabase = createBrowserSupabase();
      // auth user_metadata 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: name },
      });
      if (updateError) {
        setError('닉네임 저장에 실패했습니다. 다시 시도해주세요.');
        setSaving(false);
        return;
      }
      // profiles 테이블 업데이트
      await supabase
        .from('profiles')
        .update({ display_name: name })
        .eq('id', user.id);

      router.replace('/');
    } catch {
      setError('서버에 연결할 수 없습니다. 다시 시도해주세요.');
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1
            className="text-3xl font-bold text-indigo-600"
            style={{ fontFamily: 'Fredoka, Noto Sans KR, sans-serif' }}
          >
            PokoParty
          </h1>
          <p className="mt-2 text-slate-600">환영합니다! 닉네임을 설정해주세요</p>
        </div>

        <div className={`${UI.pageBg} p-6 rounded-xl border ${UI.rowBorder} shadow-sm space-y-4`}>
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1">
              닉네임
            </label>
            <div className="flex gap-2">
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => handleNicknameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (nicknameStatus === 'available' && checkedName === displayName.trim()) {
                      handleSubmit();
                    } else {
                      checkNickname();
                    }
                  }
                }}
                placeholder="2~20자"
                className={`flex-1 px-3 py-2 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  nicknameStatus === 'available'
                    ? 'border-green-400'
                    : nicknameStatus === 'taken'
                      ? 'border-red-400'
                      : 'border-slate-300'
                }`}
                maxLength={20}
                autoFocus
              />
              <button
                type="button"
                onClick={checkNickname}
                disabled={nicknameStatus === 'checking' || !displayName.trim()}
                className="shrink-0 px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {nicknameStatus === 'checking' ? '확인 중...' : '중복 확인'}
              </button>
            </div>
            {nicknameStatus === 'available' && (
              <p className="mt-1 text-sm text-green-600">사용 가능한 닉네임입니다.</p>
            )}
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || nicknameStatus !== 'available' || checkedName !== displayName.trim()}
            className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                저장 중...
              </span>
            ) : '시작하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
