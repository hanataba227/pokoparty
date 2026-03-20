import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* 히어로 섹션 */}
      <section className="py-20 sm:py-28 text-center">
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
          나만의 스토리 파티를
          <br />
          <span className="text-indigo-600">
            만들어보세요
          </span>
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          포켓몬 스토리 공략에 최적화된 파티를 추천받으세요.
          <br className="hidden sm:block" />
          체육관별 타입 상성을 분석하고, 최고의 조합을 찾아드립니다.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/recommend"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl
              bg-indigo-600 text-white font-semibold text-lg
              hover:bg-indigo-700 transition-colors duration-200
              shadow-lg shadow-indigo-500/25
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            추천 시작
          </Link>
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl
              border-2 border-slate-300
              text-slate-700 font-semibold text-lg
              hover:border-indigo-400 hover:text-indigo-600
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            파티 분석
          </Link>
        </div>
      </section>
    </div>
  );
}
