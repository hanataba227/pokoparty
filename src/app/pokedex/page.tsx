import Link from 'next/link';
import { UI } from '@/lib/ui-tokens';
import { loadPokedex } from '@/lib/pokedex-loader';
import PokedexList from '@/components/PokedexList';

// 인기 포켓몬: API에서 가져올 때까지 빈 상태
const DEFAULT_POPULAR: number[] = [];

export default function PokedexPage() {
  const allPokemon = loadPokedex();

  return (
    <main className={`min-h-screen ${UI.pageBg} pb-12`}>
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <Link
          href="/recommend"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <span>&larr;</span>
          <span>추천 목록</span>
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">포켓몬 도감</h1>
        <PokedexList pokemon={allPokemon} defaultPopularIds={DEFAULT_POPULAR} />
      </div>
    </main>
  );
}
