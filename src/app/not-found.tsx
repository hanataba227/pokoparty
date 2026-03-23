import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-6xl mb-4">?</div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        야생의 포켓몬이 도망갔다!
      </h1>
      <p className="text-slate-500 mb-6">
        요청하신 페이지를 찾을 수 없습니다.
      </p>
      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
