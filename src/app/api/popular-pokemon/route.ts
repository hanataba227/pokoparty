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
      return NextResponse.json(
        { error: '인기 포켓몬 데이터를 조회하는 중 오류가 발생했습니다.', popular: [], source: 'error' },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ popular: [], source: 'empty' });
    }

    return NextResponse.json({ popular: data, source: 'database' });
  } catch (error) {
    console.error('인기 포켓몬 API 오류:', error);
    return NextResponse.json(
      { error: '인기 포켓몬 API 처리 중 오류가 발생했습니다.', popular: [], source: 'error' },
      { status: 500 },
    );
  }
});
