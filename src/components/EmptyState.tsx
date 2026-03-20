'use client';

import Link from 'next/link';

export default function EmptyState() {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">
        저장한 파티가 없습니다
      </h3>
      <p className="text-sm text-slate-500 mb-6">
        파티를 추천받아 저장해보세요!
      </p>
      <Link
        href="/recommend"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        파티 추천받기
      </Link>
    </div>
  );
}
