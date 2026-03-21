import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { withRateLimit } from '@/lib/rate-limit';

export const GET = withRateLimit(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(Number(searchParams.get('limit') || 8), 20);

  try {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase.rpc('get_popular_pokemon', {
      result_limit: limit,
    });

    if (error) {
      console.error('인기 포켓몬 DB 조회 오류:', error);
      return NextResponse.json({ popular: [], source: 'empty' });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ popular: [], source: 'empty' });
    }

    return NextResponse.json({ popular: data, source: 'database' });
  } catch (error) {
    console.error('인기 포켓몬 API 오류:', error);
    return NextResponse.json({ popular: [], source: 'empty' });
  }
});
