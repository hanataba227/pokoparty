/**
 * DELETE /api/account/delete — 회원탈퇴
 *
 * 처리 순서: saved_parties 삭제 → profiles 삭제 → auth user 삭제
 * 데이터 삭제 실패는 로그 후 계속 진행, auth user 삭제 실패 시 500 반환
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-admin";
import { requireAuth } from "@/lib/auth-guard";
import { getApiErrorMessage } from "@/lib/api-error";
import { withRateLimit } from "@/lib/rate-limit";

async function handler(_request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const userId = user.id;

    const adminSupabase = createAdminSupabase();

    // 1. saved_parties 삭제 (FK 참조 데이터 먼저) — Admin 클라이언트로 RLS 우회
    const { error: partiesError } = await adminSupabase
      .from("saved_parties")
      .delete()
      .eq("user_id", userId);

    if (partiesError) {
      console.error("회원탈퇴 - saved_parties 삭제 오류:", partiesError);
    }

    // 2. profiles 삭제 — Admin 클라이언트로 RLS 우회
    const { error: profilesError } = await adminSupabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profilesError) {
      console.error("회원탈퇴 - profiles 삭제 오류:", profilesError);
    }

    // 3. Auth 유저 삭제 (service_role 필수)
    const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("회원탈퇴 - auth user 삭제 오류:", deleteUserError);
      return NextResponse.json(
        { error: "회원탈퇴 처리 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("회원탈퇴 API 오류:", error);
    const message = getApiErrorMessage(error, "회원탈퇴 처리 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const DELETE = withRateLimit(handler);
