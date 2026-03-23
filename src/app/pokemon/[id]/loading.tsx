import { UI } from '@/lib/ui-tokens';

export default function PokemonDetailLoading() {
  return (
    <main className={`min-h-screen ${UI.pageBg} pb-12`}>
      <div className="max-w-4xl mx-auto px-4 pt-4">
        {/* 네비게이션 스켈레톤 */}
        <div className="flex items-center justify-between py-2">
          <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-20 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 소개 + 진화 스켈레톤 */}
          <div className="flex flex-col gap-6">
            <div className={`${UI.border} p-6`}>
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-slate-200 rounded-full animate-pulse mb-3" />
                <div className="h-7 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-3" />
                <div className="flex gap-1.5">
                  <div className="h-6 w-14 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-6 w-14 bg-slate-200 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            <div className={`${UI.border} p-4 h-24`}>
              <div className="flex items-center justify-center h-full gap-4">
                <div className="w-16 h-16 bg-slate-200 rounded animate-pulse" />
                <div className="w-8 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="w-16 h-16 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* 종족값 스켈레톤 */}
          <div className={`${UI.border} p-4`}>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
                  <div className="flex-1 h-4 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 타입 상성 스켈레톤 */}
        <div className={`${UI.border} p-4`}>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
