import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { UI } from '@/lib/ui-tokens';
import { getSpriteUrl } from '@/lib/sprite';
import { findPokemonAcrossGames, getMovesForPokemon, loadTypeChart, loadEncounters, loadPokemonData } from '@/lib/data-loader';
import { getGeneration } from '@/lib/pokemon-gen';
import TypeBadge from '@/components/TypeBadge';
import StatBar from '@/components/StatBar';
import TypeMatchup from '@/components/TypeMatchup';
import MoveTable from '@/components/MoveTable';
import EvolutionTree from '@/components/EvolutionTree';
import EncounterInfo from '@/components/EncounterInfo';
import PokemonNav from '@/components/PokemonNav';
import { loadPokedex } from '@/lib/pokedex-loader';

/** 실제 게임 데이터가 존재하는 포켓몬만 정적 생성 */
export function generateStaticParams() {
  const pokedex = loadPokedex();
  return pokedex
    .filter((p) => !!findPokemonAcrossGames(p.id))
    .map((p) => ({ id: String(p.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = findPokemonAcrossGames(Number(id));
  if (!result) return { title: '포켓몬을 찾을 수 없습니다' };

  const { pokemon } = result;
  const title = `${pokemon.name} #${pokemon.id} - 타입·기술·상성 정보`;
  const description = `${pokemon.name}의 타입, 종족값, 기술 목록, 타입 상성, 진화 정보를 확인하세요. 포코파티에서 최적의 파티를 구성하세요.`;
  const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [artworkUrl],
    },
    other: {
      'script:ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        name: `${pokemon.name} #${pokemon.id}`,
        headline: title,
        description,
        image: artworkUrl,
        url: `https://www.pokoparty.com/pokemon/${pokemon.id}`,
        publisher: {
          '@type': 'Organization',
          name: '포코파티',
          url: 'https://www.pokoparty.com',
        },
      }),
    },
  };
}

export default async function PokemonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pokemonId = Number(id);

  if (isNaN(pokemonId)) {
    notFound();
  }

  const result = findPokemonAcrossGames(pokemonId);

  if (!result) {
    notFound();
  }

  const { pokemon, gameVersion } = result;
  const moves = getMovesForPokemon(pokemonId, gameVersion);
  const typeChart = loadTypeChart();
  const encounters = loadEncounters(gameVersion).filter((e) => e.pokemonId === pokemonId);
  const allPokemon = loadPokemonData(gameVersion);

  // 진화 체인용 포켓몬 목록 (id + name + evolutions)
  const allPokemonBrief = allPokemon.map((p) => ({
    id: p.id,
    name: p.name,
    evolutions: p.evolutions,
  }));

  const spriteUrl = getSpriteUrl(pokemon.id);

  const generation = getGeneration(pokemon.id);

  // 도감 네비게이션용 데이터
  const pokedex = loadPokedex();
  const currentIdx = pokedex.findIndex((p) => p.id === pokemonId);
  const prevPokemon = currentIdx > 0 ? { id: pokedex[currentIdx - 1].id, name: pokedex[currentIdx - 1].name } : null;
  const nextPokemon = currentIdx >= 0 && currentIdx < pokedex.length - 1 ? { id: pokedex[currentIdx + 1].id, name: pokedex[currentIdx + 1].name } : null;

  // JSON-LD 구조화 데이터
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    name: `${pokemon.name} #${pokemon.id}`,
    headline: `${pokemon.name} #${pokemon.id} - 타입·기술·상성 정보`,
    description: `${pokemon.name}의 타입, 종족값, 기술 목록, 타입 상성, 진화 정보를 확인하세요.`,
    image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
    url: `https://www.pokoparty.com/pokemon/${pokemon.id}`,
    publisher: {
      '@type': 'Organization',
      name: '포코파티',
      url: 'https://www.pokoparty.com',
    },
  };

  return (
    <main className={`min-h-screen ${UI.pageBg} pb-12`}>
      {/* JSON-LD 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 도감 네비게이션 */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <PokemonNav
          prev={prevPokemon}
          current={{ id: pokemon.id, name: pokemon.name }}
          next={nextPokemon}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-4 space-y-6">
        {/* Row 1: 소개+진화(좌) | 종족값(우) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col gap-6">
            {/* 소개 */}
            <section>
              <h2 className={UI.sectionTitle}>소개</h2>
              <div className={`${UI.border} p-6 text-center`}>
                <div className="w-24 h-24 mx-auto relative mb-3">
                  <Image
                    src={spriteUrl}
                    alt={pokemon.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-contain"

                  />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{pokemon.name}</h1>
                <p className="text-slate-400 text-sm mb-3">
                  #{String(pokemon.id).padStart(3, '0')} · {generation}세대
                </p>
                <div className="flex justify-center gap-1.5">
                  {pokemon.types.map((type) => (
                    <TypeBadge key={type} type={type} size="lg" />
                  ))}
                </div>
              </div>
            </section>

            {/* 진화 */}
            <section className="flex-1 flex flex-col">
              <h2 className={UI.sectionTitle}>진화</h2>
              <div className="flex-1">
                <EvolutionTree
                  evolutions={pokemon.evolutions}
                  currentPokemonId={pokemon.id}
                  allPokemon={allPokemonBrief}
                />
              </div>
            </section>
          </div>

          {/* 종족값 */}
          <section className="flex flex-col">
            <h2 className={UI.sectionTitle}>종족값</h2>
            <div className="flex-1">
              <StatBar stats={pokemon.stats} />
            </div>
          </section>
        </div>

        {/* Row 2: 타입 상성 (풀 와이드) */}
        <section>
          <h2 className={UI.sectionTitle}>타입 상성</h2>
          <TypeMatchup types={pokemon.types} typeChart={typeChart} />
        </section>

        {/* Row 3: 습득 기술(좌) + 출현 정보(우) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
            <h2 className={UI.sectionTitle}>습득 기술</h2>
            <MoveTable moves={moves} pokemonTypes={pokemon.types} />
          </section>

          <section>
            <h2 className={UI.sectionTitle}>출현 정보</h2>
            {encounters.length > 0 ? (
              <EncounterInfo encounters={encounters} />
            ) : (
              <p className="text-sm text-slate-400">출현 정보 없음</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
