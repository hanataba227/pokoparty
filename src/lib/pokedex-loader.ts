import fs from 'fs';
import path from 'path';
import type { PokemonType } from '@/types/pokemon';

export interface PokedexEntry {
  id: number;
  name: string;
  types: PokemonType[];
}

let cache: PokedexEntry[] | null = null;

export function loadPokedex(): PokedexEntry[] {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), 'data', 'pokedex-all.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  cache = JSON.parse(raw) as PokedexEntry[];
  return cache;
}

export { GEN_RANGES, getGeneration } from './pokemon-gen';

import { GEN_RANGES as _GEN_RANGES } from './pokemon-gen';

export function getPokedexByGeneration(gen: number): PokedexEntry[] {
  const range = _GEN_RANGES[gen - 1];
  if (!range) return [];
  return loadPokedex().filter((p) => p.id >= range[0] && p.id <= range[1]);
}
