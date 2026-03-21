import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') || 8), 20);

  try {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase.rpc('get_popular_pokemon', {
      result_limit: limit,
    });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ popular: [], source: 'empty' });
    }

    return NextResponse.json({ popular: data, source: 'database' });
  } catch {
    return NextResponse.json({ popular: [], source: 'empty' });
  }
}
