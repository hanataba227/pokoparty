/**
 * GET /api/account/check-nickname?name=xxx — 닉네임 중복 확인
 * 누구나 호출 가능 (회원가입 전 확인용)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { withRateLimit } from "@/lib/rate-limit";

async function handler(request: NextRequest): Promise<NextResponse> {
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "닉네임을 입력해주세요." },
      { status: 400 },
    );
  }

  if (name.length < 2 || name.length > 20) {
    return NextResponse.json(
      { error: "닉네임은 2~20자여야 합니다." },
      { status: 400 },
    );
  }

  try {
    const adminSupabase = createAdminSupabase();
    const { data, error } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("display_name", name)
      .limit(1);

    if (error) {
      console.error("닉네임 중복 확인 오류:", error);
      return NextResponse.json(
        { error: "확인 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    const available = !data || data.length === 0;
    return NextResponse.json({ available });
  } catch (error) {
    console.error("닉네임 중복 확인 API 오류:", error);
    return NextResponse.json(
      { error: "확인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(handler);
