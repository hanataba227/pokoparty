/**
 * API 라우트 인증 헬퍼
 * Supabase 인증 확인 보일러플레이트를 공통화
 */
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import type { User } from "@supabase/supabase-js";

type AuthResult =
  | { user: User; error: null }
  | { user: null; error: NextResponse };

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      ),
    };
  }

  return { user, error: null };
}
