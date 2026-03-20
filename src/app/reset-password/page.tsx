'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { getAuthErrorMessage } from '@/lib/auth-error';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin + '/reset-password' }
      );
      if (authError) {
        setError(getAuthErrorMessage(authError));
      } else {
        setSuccess(true);
      }
    } catch {
      setError('서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.');
    } finally {
      setLoading(false);
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
          <p className="mt-2 text-slate-600">비밀번호 재설정</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-800">이메일을 확인해주세요</h2>
              <p className="text-sm text-slate-600">
                비밀번호 재설정 링크를 보냈습니다.
                <br />
                메일함을 확인해주세요.
              </p>
              <Link
                href="/login"
                className="inline-block mt-2 text-indigo-600 hover:text-indigo-500 font-medium text-sm transition-colors"
              >
                로그인 페이지로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <p className="text-sm text-slate-600">
                가입 시 사용한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
              </p>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading ? '전송 중...' : '재설정 링크 보내기'}
              </button>

              <p className="text-center text-sm text-slate-600">
                <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors">
                  로그인으로 돌아가기
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
