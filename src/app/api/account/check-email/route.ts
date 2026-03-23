/**
 * GET /api/account/check-email?email=xxx — 이메일 가입 여부 확인
 * 회원가입 전 Google OAuth 등 기존 계정 존재 여부를 확인한다.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { withRateLimit } from "@/lib/rate-limit";

async function handler(request: NextRequest): Promise<NextResponse> {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { error: "이메일을 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const adminSupabase = createAdminSupabase();

    // admin API로 이메일로 유저 조회
    const { data, error } = await adminSupabase.auth.admin.listUsers();

    if (error) {
      console.error("이메일 확인 오류:", error);
      return NextResponse.json(
        { error: "확인 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    const existingUser = data.users.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (!existingUser) {
      return NextResponse.json({ available: true });
    }

    // 기존 유저의 가입 방식 확인
    const providers = existingUser.app_metadata?.providers as
      | string[]
      | undefined;
    const hasGoogle = providers?.includes("google");
    const hasEmail = providers?.includes("email");

    if (hasGoogle && !hasEmail) {
      return NextResponse.json({
        available: false,
        reason: "google",
        message: "Google 계정으로 가입된 이메일입니다. Google 로그인을 이용해주세요.",
      });
    }

    return NextResponse.json({
      available: false,
      reason: "email",
      message: "이미 가입된 이메일입니다.",
    });
  } catch (error) {
    console.error("이메일 확인 API 오류:", error);
    return NextResponse.json(
      { error: "확인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export const GET = withRateLimit(handler);
