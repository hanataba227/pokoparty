'use client';

import { useState, Suspense } from 'react';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { getAuthErrorMessage } from '@/lib/auth-error';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import AuthForm from '@/components/AuthForm';
import OAuthButton from '@/components/OAuthButton';
import { UI } from '@/lib/ui-tokens';

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
  </div>
);

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { router, user, authLoading, redirect } = useAuthRedirect();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: { email: string; password: string }) => {
    setError('');
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (authError) {
        setError(getAuthErrorMessage(authError));
        setLoading(false);
      } else {
        router.replace(redirect);
      }
    } catch {
      setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.');
      setLoading(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;
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
          <p className="mt-2 text-slate-600">로그인하여 파티를 관리하세요</p>
        </div>

        <div className={`${UI.pageBg} p-6 rounded-xl border ${UI.rowBorder} shadow-sm`}>
          <AuthForm
            mode="login"
            onSubmit={handleSubmit}
            error={error}
            loading={loading}
          />
          <div className="mt-4">
            <OAuthButton />
          </div>
        </div>
      </div>
    </div>
  );
}
