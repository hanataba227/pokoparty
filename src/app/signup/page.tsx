'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { getAuthErrorMessage } from '@/lib/auth-error';
import AuthForm from '@/components/AuthForm';
import OAuthButton from '@/components/OAuthButton';
import { UI } from '@/lib/ui-tokens';

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirect);
    }
  }, [user, authLoading, router, redirect]);

  const handleSubmit = async (data: {
    email: string;
    password: string;
    displayName?: string;
  }) => {
    setError('');
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { display_name: data.displayName },
        },
      });
      if (authError) {
        setError(getAuthErrorMessage(authError));
        setLoading(false);
      } else {
        setSuccess(true);
        setLoading(false);
      }
    } catch {
      setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) return null;

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
          <p className="mt-2 text-slate-600">계정을 만들어 파티를 저장하세요</p>
        </div>

        {success ? (
          <div className={`${UI.pageBg} p-6 rounded-xl border ${UI.rowBorder} shadow-sm text-center space-y-4`}>
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">이메일을 확인해주세요</h2>
            <p className="text-sm text-slate-600">
              입력하신 이메일로 인증 링크를 보냈습니다.
              <br />
              메일함을 확인하여 가입을 완료해주세요.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-2 text-indigo-600 hover:text-indigo-500 font-medium text-sm transition-colors cursor-pointer"
            >
              로그인 페이지로 이동
            </button>
          </div>
        ) : (
          <div className={`${UI.pageBg} p-6 rounded-xl border ${UI.rowBorder} shadow-sm`}>
            <AuthForm
              mode="signup"
              onSubmit={handleSubmit}
              error={error}
              loading={loading}
            />
            <div className="mt-4">
              <OAuthButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
