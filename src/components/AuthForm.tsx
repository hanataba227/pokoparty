'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { validatePassword } from '@/lib/auth-error';

interface AuthFormData {
  email: string;
  password: string;
  displayName?: string;
}

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (data: AuthFormData) => Promise<void>;
  error?: string;
  loading?: boolean;
}

export default function AuthForm({ mode, onSubmit, error, loading }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = '이메일을 입력해주세요.';
    }
    if (!password) {
      errors.password = '비밀번호를 입력해주세요.';
    } else {
      const pwError = validatePassword(password);
      if (pwError) {
        errors.password = pwError;
      }
    }
    if (mode === 'signup' && !displayName.trim()) {
      errors.displayName = '닉네임을 입력해주세요.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    await onSubmit({
      email: email.trim(),
      password,
      ...(mode === 'signup' ? { displayName: displayName.trim() } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {mode === 'signup' && (
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1">
            닉네임
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="닉네임을 입력하세요"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            maxLength={20}
          />
          {fieldErrors.displayName && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.displayName}</p>
          )}
        </div>
      )}

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
        {fieldErrors.email && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="영문 + 숫자 조합 8자 이상"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {fieldErrors.password && (
          <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
        )}
      </div>

      {mode === 'login' && (
        <div className="text-right">
          <Link
            href="/reset-password"
            className="text-sm text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            비밀번호를 잊으셨나요?
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            처리 중...
          </span>
        ) : mode === 'login' ? '로그인' : '회원가입'}
      </button>

      <p className="text-center text-sm text-slate-600">
        {mode === 'login' ? (
          <>
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors">
              회원가입
            </Link>
          </>
        ) : (
          <>
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors">
              로그인
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
