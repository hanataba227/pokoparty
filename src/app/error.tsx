'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-6xl mb-4">!</div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        문제가 발생했습니다
      </h1>
      <p className="text-slate-500 mb-6">
        {process.env.NODE_ENV === 'development'
          ? error.message
          : '잠시 후 다시 시도해 주세요.'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
