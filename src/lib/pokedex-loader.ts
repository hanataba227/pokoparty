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
