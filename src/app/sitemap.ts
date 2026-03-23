import type { MetadataRoute } from 'next';
import { loadPokedex } from '@/lib/pokedex-loader';
import { findPokemonAcrossGames } from '@/lib/data-loader';

const SITE_URL = 'https://www.pokoparty.com';

export default function sitemap(): MetadataRoute.Sitemap {
  // robots.ts에서 disallow된 /login, /signup은 사이트맵에서 제외
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/recommend`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/analyze`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/pokedex`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ];

  // 실제 게임 데이터가 존재하는 포켓몬만 사이트맵에 등록
  const pokedex = loadPokedex();
  const pokemonPages: MetadataRoute.Sitemap = pokedex
    .filter((p) => !!findPokemonAcrossGames(p.id))
    .map((p) => ({
      url: `${SITE_URL}/pokemon/${p.id}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

  return [...staticPages, ...pokemonPages];
}
